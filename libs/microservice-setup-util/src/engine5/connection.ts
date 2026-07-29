import * as net from 'net';
import * as tls from 'node:tls';
import {
    CtConnectError,
    CtResponse,
    Payload,
    CtRequest,
    CtEvent,
    CtResponseError,
    CtConsumingSuccess,
    CtConsumingError,
} from './payload';
import { encode, decode } from '@msgpack/msgpack';
import { AsyncMutex } from '@ubs-platform/async-mutex';
import { ReplaySubject } from 'rxjs';

type ConnectionStatus = 'CONNECTING' | 'CLOSED' | 'CONNECTED';
type CallbackFunction = (data: any) => any;
type RequestCallback = (response: Payload) => void;
type TLSClientOptions = Pick<
    tls.ConnectionOptions,
    'ca' | 'cert' | 'key' | 'servername' | 'rejectUnauthorized'
>;

export interface Engine5ConnectionOptions {
    host: string;
    port: string | number;
    instanceGroup?: string;
    instanceId?: string;
    tlsEnabled?: boolean;
    tlsOptions?: TLSClientOptions;
    authKey?: string;
}

export class Engine5Connection {
    private tcpClient: net.Socket | tls.TLSSocket = new net.Socket();
    private connectionStatus: ConnectionStatus = 'CLOSED';
    private readonly connectionStatusSubject =
        new ReplaySubject<ConnectionStatus>(1);
    private readonly listeningSubjectCallbacks: Record<string, CallbackFunction[]> =
        {};
    private readonly ongoingRequestsToComplete: Record<string, RequestCallback> =
        {};
    // Keep socket I/O and control-plane operations on separate mutexes so a locked
    // task that awaits another mutex cannot deadlock the whole pipeline.
    private readonly writeMutex = new AsyncMutex();
    private readonly readMutex = new AsyncMutex();
    private readonly generalMutex = new AsyncMutex();
    private reconnectOnFail = true;
    private tcpClientEventsRegistered = false;
    private reconnectInterval: NodeJS.Timeout | null = null;
    private connectionTimeout: NodeJS.Timeout | null = null;
    private host: string;
    private port: string | number;
    private instanceGroup?: string;
    private instanceId?: string;
    private tlsEnabled: boolean = false;
    private tlsOptions?: TLSClientOptions;
    private authKey?: string;
    private readonly processedEventMessageIds = new Map<string, number>();
    private readonly processedEventTtlMs = 2 * 60 * 1000;

    constructor(connectOptions: Engine5ConnectionOptions) {
        this.host = connectOptions.host;
        this.port = connectOptions.port;
        this.instanceGroup = connectOptions.instanceGroup;
        this.instanceId = connectOptions.instanceId;
        this.tlsEnabled = connectOptions.tlsEnabled ?? false;
        this.tlsOptions = connectOptions.tlsOptions;
        this.authKey = connectOptions.authKey;

        this.connectionStatusSubject.next('CLOSED');
        this.startReconnectTimer();
    }

    private cleanupProcessedEventMessageIds(now = Date.now()): void {
        for (const [messageId, timestamp] of this.processedEventMessageIds) {
            if (now - timestamp > this.processedEventTtlMs) {
                this.processedEventMessageIds.delete(messageId);
            }
        }
    }

    private isDuplicateEventMessage(messageId?: string): boolean {
        if (!messageId) {
            return false;
        }

        const now = Date.now();
        this.cleanupProcessedEventMessageIds(now);

        if (this.processedEventMessageIds.has(messageId)) {
            return true;
        }

        this.processedEventMessageIds.set(messageId, now);
        return false;
    }

    private startReconnectTimer(): void {
        this.reconnectInterval = setInterval(() => {
            if (this.reconnectOnFail && this.connectionStatus === 'CLOSED') {
                console.info('Attempting to reconnect...');
                void this.init().catch((error) => {
                    console.error('Reconnection failed:', error);
                });
            }
        }, 5000);
    }

    private setConnectionStatus(status: ConnectionStatus): void {
        this.connectionStatus = status;
        this.connectionStatusSubject.next(status);
    }

    private clearConnectionTimeout(): void {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
    }

    private runAtWhenConnected<T>(action: () => T | Promise<T>): Promise<T> {
        if (this.connectionStatus === 'CONNECTED') {
            try {
                return Promise.resolve(action());
            } catch (error) {
                return Promise.reject(error);
            }
        }

        return new Promise((resolve, reject) => {
            const subscription = this.connectionStatusSubject.subscribe(
                async (status) => {
                    if (status !== 'CONNECTED') {
                        return;
                    }

                    subscription.unsubscribe();
                    try {
                        resolve(await action());
                    } catch (error) {
                        reject(error);
                    }
                },
            );
        });
    }

    private writePayload(payload: Payload): Promise<Engine5Connection> {
        const outboundPayload = { ...payload, AuthKey: this.authKey };

        return this.writeMutex.run(
            () =>
                new Promise<Engine5Connection>((resolve, reject) => {
                    try {
                        const msgpackData = Buffer.from(encode(outboundPayload));
                        const lengthPrefix = Buffer.alloc(4);
                        lengthPrefix.writeUInt32BE(msgpackData.length, 0);
                        const fullMessage = Buffer.concat([lengthPrefix, msgpackData]);

                        this.tcpClient.write(fullMessage, (error) => {
                            if (error) {
                                console.error('Failed to write payload:', error);
                                reject(error);
                                return;
                            }

                            resolve(this);
                        });
                    } catch (error) {
                        console.error('Error encoding payload:', error);
                        reject(error);
                    }
                }),
        );
    }

    async listen(subject: string, callback: CallbackFunction): Promise<void> {
        if (!subject) {
            throw new Error('Subject cannot be empty');
        }

        console.info('Listening to subject: ' + subject);

        return this.generalMutex.run(async () => {
            await this.writeListenCommand(subject);
            const callbacks = this.listeningSubjectCallbacks[subject] ?? [];
            if (!callbacks.includes(callback)) {
                callbacks.push(callback);
                this.listeningSubjectCallbacks[subject] = callbacks;
            }
        });
    }

    private async writeListenCommand(subject: string): Promise<void> {
        await this.writePayload({
            Command: 'LISTEN',
            Subject: subject,
            MessageId: this.generateMessageId(),
        });
    }

    private generateMessageId(): string {
        return `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    }

    async sendRequest<T = any>(subject: string, data: any): Promise<T> {
        if (!subject) {
            throw new Error('Subject cannot be empty');
        }

        const messageId = this.generateMessageId();

        if (this.connectionStatus !== 'CONNECTED') {
            await this.init();
        }

        await this.writePayload({
            Command: 'REQUEST',
            Subject: subject,
            Content: this.stringifyData(data),
            MessageId: messageId,
        });

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                delete this.ongoingRequestsToComplete[messageId];
                reject(new Error(`Request timeout for subject: ${subject}`));
            }, 30000);

            this.ongoingRequestsToComplete[messageId] = (response: Payload) => {
                delete this.ongoingRequestsToComplete[messageId];
                clearTimeout(timeout);
                if (response.Command === CtResponseError) {
                    const errorSide = response.ResponseErrorSide || 'E5';
                    const errorMessage = `Response error from ${errorSide === 'E5' ? 'server' : 'client'}: ${response.Content}`;
                    console.error(errorMessage);
                    reject(new Error(errorMessage));
                    return;
                }

                try {
                    const result = response.Content
                        ? this.parseData(response.Content)
                        : undefined;
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };
        });
    }

    async sendEvent(subject: string, data: any): Promise<void> {
        if (!subject) {
            throw new Error('Subject cannot be empty');
        }

        if (this.connectionStatus !== 'CONNECTED') {
            throw new Error('Not connected to the server');
        }

        await this.writePayload({
            Command: 'EVENT',
            Subject: subject,
            Content: this.stringifyData(data),
        });
    }

    async init(): Promise<Engine5Connection> {
        if (this.connectionStatus === 'CLOSED') {
            return new Promise<Engine5Connection>((resolve) => {
                this._init(resolve);
            });
        }

        return this.runAtWhenConnected(() => this);
    }

    private _init(
        ok: (value: Engine5Connection | PromiseLike<Engine5Connection>) => void,
    ) {
        this.setConnectionStatus('CONNECTING');
        console.info('Connecting to server');

        if (this.tlsEnabled) {
            const tlsSocket = tls.connect({
                host: this.host,
                port: Number(this.port),
                ca: this.tlsOptions?.ca,
                cert: this.tlsOptions?.cert,
                key: this.tlsOptions?.key,
                servername: this.tlsOptions?.servername ?? this.host,
                rejectUnauthorized: this.tlsOptions?.rejectUnauthorized ?? true,
            });

            this.tcpClient = tlsSocket;
            this.tcpClientEventsRegistered = false;
            this.registerEvents(tlsSocket, ok);

            tlsSocket.once('secureConnect', () => {
                this.startConnection();
            });

            return;
        }

        this.tcpClient = new net.Socket();
        this.tcpClientEventsRegistered = false;
        const client = this.tcpClient;
        this.registerEvents(client, ok);

        try {
            client.connect(
                {
                    host: this.host,
                    port: Number(this.port),
                },
                () => {
                    this.startConnection();
                },
            );
        } catch (error) {
            console.error('Connection error:', error);
        }
    }

    private registerEvents(
        client: net.Socket | tls.TLSSocket,
        ok: (value: Engine5Connection | PromiseLike<Engine5Connection>) => void,
    ) {
        if (this.tcpClientEventsRegistered) {
            return;
        }

        let currentBuff: number[] = [];
        let sizeBytes: number[] = [];
        let incomingLength = 0;

        client.on('data', (data: Buffer) => {
            void this.readMutex.run(() => {
                let offset = 0;

                while (offset < data.length) {
                    if (sizeBytes.length < 4) {
                        sizeBytes.push(data[offset]);
                        offset += 1;

                        if (sizeBytes.length === 4) {
                            incomingLength = Buffer.from(sizeBytes).readUInt32BE(0);
                        }
                        continue;
                    }

                    const bytesNeeded = incomingLength - currentBuff.length;
                    const bytesAvailable = data.length - offset;
                    const bytesToRead = Math.min(bytesNeeded, bytesAvailable);

                    currentBuff.push(...data.subarray(offset, offset + bytesToRead));
                    offset += bytesToRead;

                    if (currentBuff.length === incomingLength) {
                        const messageBuffer = Buffer.from(currentBuff);
                        void this.processIncomingData(messageBuffer, ok);
                        sizeBytes = [];
                        currentBuff = [];
                        incomingLength = 0;
                    }
                }
            });
        });

        client.on('error', (err: Error) => {
            console.error('Socket error occurred:', err);

            const errorMessage = err.message.toLowerCase();
            if (
                errorMessage.includes('ssl') ||
                errorMessage.includes('tls') ||
                errorMessage.includes('handshake') ||
                errorMessage.includes('wrong version number')
            ) {
                console.error(
                    'TLS error detected. Make sure both client and server use the same TLS configuration.',
                );
                console.error('Client TLS enabled: ' + this.tlsEnabled);
            }

            this.setConnectionStatus('CLOSED');
        });

        client.on('end', () => {
            this.setConnectionStatus('CLOSED');
            console.log('Connection ended by server');
        });

        client.on('close', () => {
            this.setConnectionStatus('CLOSED');
            console.log('Connection closed');
        });

        client.on('session', () => {
            console.info('TLS session established');
        });

        this.tcpClientEventsRegistered = true;
    }

    private startConnection() {
        this.connectionTimeout = setTimeout(() => {
            if (this.connectionStatus === 'CONNECTING') {
                console.error(
                    'Connection timeout: Server might require TLS but client is not using TLS, or vice versa',
                );
                this.tcpClient.destroy();
                this.setConnectionStatus('CLOSED');
            }
        }, 10000);

        if (this.tlsEnabled) {
            const tlsSocket = this.tcpClient as tls.TLSSocket;
            if (tlsSocket.authorizationError) {
                if (this.tlsOptions?.rejectUnauthorized === false) {
                    console.warn(
                        'TLS authorization warning (ignored by configuration): ' +
                        tlsSocket.authorizationError,
                    );
                } else {
                    console.error(
                        'TLS authorization error: ' + tlsSocket.authorizationError,
                    );
                    this.tcpClient.destroy();
                    return;
                }
            }
        }

        void this.writePayload({
            Command: 'CONNECT',
            InstanceId: this.instanceId || '',
            InstanceGroup: this.instanceGroup || this.instanceId,
        });

        for (const subject of Object.keys(this.listeningSubjectCallbacks)) {
            void this.writeListenCommand(subject)
                .then(() => console.info('Listening subject again: ' + subject))
                .catch(console.error);
        }
    }

    private async processIncomingData(
        data: Buffer,
        promiseResolveFunc?: (
            value: Engine5Connection | PromiseLike<Engine5Connection>,
        ) => void,
    ) {
        let decoded: Payload;

        try {
            decoded = decode(data) as Payload;
        } catch (error) {
            console.error(
                'Failed to decode message. This usually indicates a TLS mismatch:',
            );
            console.error(
                'If the server requires TLS but client is not using TLS, or vice versa, decoding will fail.',
            );
            console.error('Decode error:', error);
            this.tcpClient.destroy();
            this.setConnectionStatus('CLOSED');
            return;
        }

        switch (decoded.Command) {
            case 'CONNECT_SUCCESS': {
                this.clearConnectionTimeout();
                this.setConnectionStatus('CONNECTED');
                this.instanceId = decoded.InstanceId!;
                this.instanceGroup = decoded.InstanceGroup!;
                promiseResolveFunc?.(this);
                console.info('Connected Successfully');
                break;
            }
            case CtConnectError: {
                this.clearConnectionTimeout();
                console.error('Connection failed: ' + decoded.Content);
                this.tcpClient.destroy();
                this.setConnectionStatus('CLOSED');
                break;
            }
            case CtEvent: {
                if (this.isDuplicateEventMessage(decoded.MessageId)) {
                    console.warn(
                        'Duplicate event ignored for subject:',
                        decoded.Subject,
                    );
                    break;
                }
                console.info('Event recieved', decoded.Subject);
                await this.processReceivedEvent(decoded);
                break;
            }
            case CtRequest: {
                console.info('Request recieved: ', decoded.Subject);
                try {
                    const callback = this.listeningSubjectCallbacks[decoded.Subject!]?.[0];
                    if (!callback) {
                        console.warn('No callback registered for subject:', decoded.Subject);
                        return;
                    }

                    const responseContent = await callback(this.parseData(decoded.Content!));
                    await this.writePayload({
                        Command: CtResponse,
                        Content: this.stringifyData(responseContent),
                        MessageId: this.generateMessageId(),
                        Subject: decoded.Subject,
                        ResponseOfMessageId: decoded.MessageId,
                    });
                } catch (ex) {
                    console.error(ex);
                }
                break;
            }
            case CtResponse: {
                const responseOfMessageId = decoded.ResponseOfMessageId!;
                const callback =
                    this.ongoingRequestsToComplete[responseOfMessageId];
                if (callback) {
                    delete this.ongoingRequestsToComplete[responseOfMessageId];
                    await callback(decoded);
                }
                break;
            }
            case CtResponseError: {
                const errorSide = decoded.ResponseErrorSide || 'E5';
                const errorMessage = `Response error from ${errorSide === 'E5' ? 'server' : 'client'}: ${decoded.Content}`;
                console.error(errorMessage);

                const responseOfMessageId = decoded.ResponseOfMessageId!;
                const callback =
                    this.ongoingRequestsToComplete[responseOfMessageId];
                if (callback) {
                    delete this.ongoingRequestsToComplete[responseOfMessageId];
                    await callback(decoded);
                }
                break;
            }
            default:
                break;
        }
    }

    private parseData(dataString: string): any {
        if (dataString === 'undefined' || dataString === '') {
            return undefined;
        }

        try {
            return JSON.parse(dataString);
        } catch (error) {
            console.error('Failed to parse JSON data:', error);
            return dataString;
        }
    }

    private stringifyData(data: any): string {
        if (data === undefined) {
            return 'undefined';
        }

        try {
            return JSON.stringify(data);
        } catch (error) {
            console.error('Failed to stringify data:', error);
            return String(data);
        }
    }

    // TODO: Bunu async/await yapmak lazım. Callback'in bitmesini beklemeden success yazmayalım...
    private async processReceivedEvent(decoded: Payload) {
        const callbacks = this.listeningSubjectCallbacks[decoded.Subject!] ?? [];
        for (const callback of callbacks) {
            try {
                await callback(this.parseData(decoded.Content!));
                this.writePayload({
                    Command: CtConsumingSuccess,
                    Subject: decoded.Subject,
                    MessageId: decoded.MessageId,
                    InstanceGroup: this.instanceGroup,
                    InstanceId: this.instanceId,
                });
            } catch (error) {
                console.error('Error in event callback for subject ' + decoded.Subject + ':', error);
                this.writePayload({
                    Command: CtConsumingError,
                    Subject: decoded.Subject,
                    MessageId: decoded.MessageId,
                    InstanceGroup: this.instanceGroup,
                    InstanceId: this.instanceId,
                    Content: `Error in event callback: ${error instanceof Error ? error.message : String(error)}`,
                })
            }
        }
    }

    async close(): Promise<void> {
        console.info('Closing Engine5 connection...');
        this.reconnectOnFail = false;

        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }

        this.clearConnectionTimeout();

        try {
            if (this.connectionStatus === 'CONNECTED') {
                await this.writePayload({ Command: 'CLOSE' });
            }
        } catch (error) {
            console.error('Error during close:', error);
        } finally {
            for (const key of Object.keys(this.ongoingRequestsToComplete)) {
                delete this.ongoingRequestsToComplete[key];
            }
            this.processedEventMessageIds.clear();
            this.tcpClient.destroy();
            this.setConnectionStatus('CLOSED');
        }
    }

    private static globalE5Connections: { [key: string]: Engine5Connection } =
        {};

    public static create(connectOptions: Engine5ConnectionOptions) {
        const {
            host,
            port,
            instanceGroup = 'default-group',
            instanceId = 'default-id',
        } = connectOptions;
        const key = `${instanceGroup}(${instanceId})@${host}:${port}`;

        if (!this.globalE5Connections[key]) {
            const connection = new Engine5Connection(connectOptions);
            this.globalE5Connections[key] = connection;
        }

        return this.globalE5Connections[key];
    }
}
