import * as net from 'net';
import * as tls from 'node:tls';
import {
    CtConnectError,
    CtResponse,
    Payload,
    CtRequest,
    CtEvent,
} from './payload';
import { encode, decode } from '@msgpack/msgpack';
import { DynamicQueue } from './dynamic-queue';
import { ReplaySubject } from 'rxjs';
import { exec } from 'node:child_process';

type ConnectionStatus = 'CONNECTING' | 'CLOSED' | 'CONNECTED';
type CallbackFunction = (data: any) => any;
type RequestCallback = (response: any) => void;
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
    private readonly listeningSubjectCallbacks: Record<
        string,
        CallbackFunction[]
    > = {};
    private readonly ongoingRequestsToComplete: Record<
        string,
        RequestCallback
    > = {};
    private readonly queue = new DynamicQueue();
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

    constructor(connectOptions: Engine5ConnectionOptions) {
        this.host = connectOptions.host;
        this.port = connectOptions.port;
        this.instanceGroup = connectOptions.instanceGroup;
        this.instanceId = connectOptions.instanceId;
        this.tlsEnabled = connectOptions.tlsEnabled ?? false;
        this.tlsOptions = connectOptions.tlsOptions;
        this.authKey = connectOptions.authKey;

        this.connectionStatusSubject.next('CLOSED');
        this.queue.push(async () => {
            await this.runAtWhenConnected(() => {
                // Initialize connection preparation
            });
        });

        this.startReconnectTimer();
    }

    private startReconnectTimer(): void {
        this.reconnectInterval = setInterval(() => {
            if (this.reconnectOnFail && this.connectionStatus === 'CLOSED') {
                console.info('Attempting to reconnect...');
                this.init().catch((error) => {
                    console.error('Reconnection failed:', error);
                });
            }
        }, 5000);
    }

    private runAtWhenConnected<T>(action: () => T | Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            if (this.connectionStatus === 'CONNECTED') {
                try {
                    const result = action();
                    if (result instanceof Promise) {
                        result.then(resolve).catch(reject);
                    } else {
                        resolve(result);
                    }
                } catch (error) {
                    reject(error);
                }
                return;
            }

            const subscription = this.connectionStatusSubject.subscribe(
                async (status) => {
                    if (status === 'CONNECTED') {
                        subscription.unsubscribe();
                        try {
                            const result = await action();
                            resolve(result);
                        } catch (error) {
                            reject(error);
                        }
                    }
                },
            );
        });
    }

    private async writePayload(payload: Payload): Promise<Engine5Connection> {
        payload.AuthKey = this.authKey;
        return new Promise((resolve, reject) => {
            this.queue.push(() => {
                try {
                    const msgpackData = Buffer.from(encode(payload));
                    const lengthPrefix = Buffer.alloc(4);
                    lengthPrefix.writeUInt32BE(msgpackData.length, 0);
                    const fullMessage = Buffer.concat([
                        lengthPrefix,
                        msgpackData,
                    ]);

                    this.tcpClient.write(fullMessage, (error) => {
                        if (error) {
                            console.error('Failed to write payload:', error);
                            reject(error);
                        } else {
                            resolve(this);
                        }
                    });
                } catch (error) {
                    console.error('Error encoding payload:', error);
                    reject(error);
                }
            });
        });
    }

    async listen(subject: string, callback: CallbackFunction): Promise<void> {
        if (!subject) {
            throw new Error('Subject cannot be empty');
        }

        console.info('Listening to subject: ' + subject);
        this.queue.push(async () => {
            try {
                await this.writeListenCommand(subject);
                const callbacks = this.listeningSubjectCallbacks[subject] || [];
                callbacks.push(callback);
                this.listeningSubjectCallbacks[subject] = callbacks;
            } catch (error) {
                console.error(
                    'Failed to listen to subject ' + subject + ':',
                    error,
                );
                throw error;
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
            }, 30000); // 30 second timeout

            this.ongoingRequestsToComplete[messageId] = (response: Payload) => {
                clearTimeout(timeout);
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

    async init() {
        return new Promise<Engine5Connection>((ok, fail) => {
            if (this.connectionStatus == 'CLOSED') {
                this._init((v) => {
                    ok(v);
                });
            } else {
                this.runAtWhenConnected(() => {
                    ok(this);
                });
            }
        });
    }

    private _init(
        ok: (value: Engine5Connection | PromiseLike<Engine5Connection>) => void,
    ) {
        this.connectionStatusSubject.next('CONNECTING');
        this.connectionStatus = 'CONNECTING';
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
        if (this.tcpClientEventsRegistered) return;
        let currentBuff: number[] = [];
        let sizeBytes: number[] = [];
        let incomingLength = 0;
        client.on('data', (data: Buffer) => {
            this.queue.push(() => {
                let offset = 0;

                while (offset < data.length) {
                    if (sizeBytes.length < 4) {
                        // Read size prefix bytes
                        sizeBytes.push(data[offset]);
                        offset++;
                        if (sizeBytes.length === 4) {
                            incomingLength =
                                Buffer.from(sizeBytes).readUInt32BE(0);
                        }
                    } else {
                        // Read message bytes
                        const bytesNeeded = incomingLength - currentBuff.length;
                        const bytesAvailable = data.length - offset;
                        const bytesToRead = Math.min(
                            bytesNeeded,
                            bytesAvailable,
                        );

                        currentBuff.push(
                            ...data.subarray(offset, offset + bytesToRead),
                        );
                        offset += bytesToRead;

                        if (currentBuff.length === incomingLength) {
                            // We have a complete message
                            const messageBuffer = Buffer.from(currentBuff);
                            this.processIncomingData(messageBuffer, ok);
                            // Reset for next message
                            sizeBytes = [];
                            currentBuff = [];
                            incomingLength = 0;
                        }
                    }
                }
            });
        });

        client.on('error', (err: Error) => {
            console.error(`Socket error occurred:`, err);

            // Check if it's a TLS-related error
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

            this.connectionStatus = 'CLOSED';
            this.connectionStatusSubject.next('CLOSED');
        });
        client.on('end', () => {
            this.connectionStatus = 'CLOSED';
            this.connectionStatusSubject.next('CLOSED');
            console.log('Connection ended by server');
        });
        client.on('close', async () => {
            this.connectionStatus = 'CLOSED';
            this.connectionStatusSubject.next('CLOSED');
            console.log('Connection closed');
        });

        client.on('session', () => {
            console.info('TLS session established');
        });

        this.tcpClientEventsRegistered = true;
    }

    private startConnection() {
        // if (this.connectionStatus != "CONNECTING") return;

        // Set connection timeout - if CONNECT_SUCCESS doesn't arrive, there might be a TLS mismatch
        this.connectionTimeout = setTimeout(() => {
            if (this.connectionStatus === 'CONNECTING') {
                console.error(
                    'Connection timeout: Server might require TLS but client is not using TLS, or vice versa',
                );
                this.tcpClient.destroy();
                this.connectionStatus = 'CLOSED';
                this.connectionStatusSubject.next('CLOSED');
            }
        }, 10000); // 10 second timeout

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
                        'TLS authorization error: ' +
                            tlsSocket.authorizationError,
                    );
                    this.tcpClient.destroy();
                    return;
                }
            }
        }
        this.writePayload({
            Command: 'CONNECT',
            InstanceId: this.instanceId || '',
            InstanceGroup: this.instanceGroup || this.instanceId,
        });

        const alreadyListeningSubjects = Object.keys(
            this.listeningSubjectCallbacks,
        );

        for (
            let alsIndex = 0;
            alsIndex < alreadyListeningSubjects.length;
            alsIndex++
        ) {
            const als = alreadyListeningSubjects[alsIndex];
            this.writeListenCommand(als)
                .then(() => console.info('Listening subject again: ' + als))
                .catch(console.error);
        }
    }

    private async processIncomingData(
        data: any,
        promiseResolveFunc?: (
            value: Engine5Connection | PromiseLike<Engine5Connection>,
        ) => void,
    ) {
        let decoded: Payload;

        try {
            decoded = decode(data) as any as Payload;
        } catch (error) {
            console.error(
                'Failed to decode message. This usually indicates a TLS mismatch:',
            );
            console.error(
                'If the server requires TLS but client is not using TLS, or vice versa, decoding will fail.',
            );
            console.error('Decode error:', error);
            this.tcpClient.destroy();
            this.connectionStatus = 'CLOSED';
            this.connectionStatusSubject.next('CLOSED');
            return;
        }

        // console.info(decoded)
        if (decoded.Command == 'CONNECT_SUCCESS') {
            // Clear connection timeout on successful connection
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }

            this.connectionStatus = 'CONNECTED';
            this.connectionStatusSubject.next('CONNECTED');
            this.instanceId = decoded.InstanceId!;
            this.instanceGroup = decoded.InstanceGroup!;
            promiseResolveFunc?.(this);
            // this.reconnectOnFail = true;
            console.info('Connected Successfully');
        } else if (decoded.Command == CtConnectError) {
            // Clear connection timeout
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }

            console.error('Connection failed: ' + decoded.Content);
            this.tcpClient.destroy();
            this.connectionStatus = 'CLOSED';
            this.connectionStatusSubject.next('CLOSED');
        } else if (decoded.Command == CtEvent) {
            console.info('Event recieved', decoded.Subject);
            this.processReceivedEvent(decoded);
        } else if (decoded.Command == CtRequest) {
            console.info('Request recieved: ', decoded.Subject);
            try {
                const ac = await this.listeningSubjectCallbacks[
                    decoded.Subject!
                ][0](this.parseData(decoded.Content!));
                // this.ongoingRequestsToComplete[decoded.MessageId!](ac)
                await this.writePayload({
                    Command: CtResponse,
                    Content: this.stringifyData(ac),
                    MessageId: this.generateMessageId(),
                    Subject: decoded.Subject,
                    ResponseOfMessageId: decoded.MessageId,
                });
            } catch (ex) {
                console.error(ex);
            }
        } else if (decoded.Command == CtResponse) {
            this.ongoingRequestsToComplete[decoded.ResponseOfMessageId!](
                decoded,
            );
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
            return dataString; // Return original string if parsing fails
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

    private processReceivedEvent(decoded: Payload) {
        const cbs = this.listeningSubjectCallbacks[decoded.Subject!] || [];
        for (
            let callbackIndex = 0;
            callbackIndex < cbs.length;
            callbackIndex++
        ) {
            const callback = cbs[callbackIndex];
            callback(this.parseData(decoded.Content!));
        }
    }

    async close(): Promise<void> {
        console.info('Closing Engine5 connection...');
        this.reconnectOnFail = false;

        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }

        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }

        try {
            if (this.connectionStatus === 'CONNECTED') {
                await this.writePayload({ Command: 'CLOSE' });
            }
        } catch (error) {
            console.error('Error during close:', error);
        } finally {
            this.tcpClient.destroy();
            this.connectionStatus = 'CLOSED';
            this.connectionStatusSubject.next('CLOSED');
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
            const nk = new Engine5Connection(connectOptions);
            this.globalE5Connections[key] = nk;
        }

        return this.globalE5Connections[key];
    }
}
