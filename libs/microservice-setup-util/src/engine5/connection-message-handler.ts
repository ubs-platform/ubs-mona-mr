import { decode } from '@msgpack/msgpack';
import {
    CtConnectError,
    CtConsumingError,
    CtConsumingSuccess,
    CtEvent,
    CtRequest,
    CtResponse,
    CtResponseError,
    Payload,
} from './payload';
import {
    CallbackFunction,
    ConnectionStatus,
    RequestCallback,
} from './connection.types';

interface Engine5MessageHandlerContext {
    clearConnectionTimeout(): void;
    setConnectionStatus(status: ConnectionStatus): void;
    destroySocket(): void;
    setInstanceIdentity(instanceId?: string, instanceGroup?: string): void;
    getInstanceIdentity(): {
        instanceId?: string;
        instanceGroup?: string;
    };
    getCallbacks(subject: string): CallbackFunction[];
    takeRequestCallback(messageId?: string): RequestCallback | undefined;
    generateMessageId(): string;
    writePayload(payload: Payload): Promise<unknown>;
}

export class Engine5ConnectionMessageHandler {
    private readonly processedEventMessageIds = new Map<string, number>();
    private readonly processedEventTtlMs = 2 * 60 * 1000;

    constructor(private readonly context: Engine5MessageHandlerContext) {}

    parseData(dataString: string): any {
        if (dataString === 'undefined' || dataString === '') {
            return undefined;
        }

        try {
            return JSON.parse(dataString);
        } catch (error: any) {
            console.error('Failed to parse JSON data:', error);
            return dataString;
        }
    }

    stringifyData(data: any): string {
        if (data === undefined) {
            return 'undefined';
        }

        try {
            return JSON.stringify(data);
        } catch (error: any) {
            console.error('Failed to stringify data:', error);
            return String(data);
        }
    }

    async processIncomingData(
        data: Buffer,
        onConnected?: () => void,
    ): Promise<void> {
        let decoded: Payload;

        try {
            decoded = decode(data) as Payload;
            // console.debug('Decoded payload:', decoded);
        } catch (error: any) {
            console.error(
                'Failed to decode message. This usually indicates a TLS mismatch:',
            );
            console.error(
                'If the server requires TLS but client is not using TLS, or vice versa, decoding will fail.',
            );
            console.error('Decode error:', error);
            this.context.destroySocket();
            this.context.setConnectionStatus('CLOSED');
            return;
        }

        switch (decoded.Command) {
            case 'CONNECT_SUCCESS': {
                this.context.clearConnectionTimeout();
                this.context.setConnectionStatus('CONNECTED');
                this.context.setInstanceIdentity(
                    decoded.InstanceId,
                    decoded.InstanceGroup,
                );
                onConnected?.();
                console.info('Connected Successfully');
                break;
            }
            case CtConnectError: {
                this.context.clearConnectionTimeout();
                console.error('Connection failed: ' + decoded.Content);
                this.context.destroySocket();
                this.context.setConnectionStatus('CLOSED');
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
                    const callback = this.context.getCallbacks(
                        decoded.Subject!,
                    )[0];
                    if (!callback) {
                        console.warn(
                            'No callback registered for subject:',
                            decoded.Subject,
                        );
                        return;
                    }

                    const responseContent = await callback(
                        this.parseData(decoded.Content!),
                    );
                    await this.context.writePayload({
                        Command: CtResponse,
                        Content: this.stringifyData(responseContent),
                        MessageId: this.context.generateMessageId(),
                        Subject: decoded.Subject,
                        ResponseOfMessageId: decoded.MessageId,
                    });
                } catch (ex) {
                    console.error(ex);
                }
                break;
            }
            case CtResponse: {
                const callback = this.context.takeRequestCallback(
                    decoded.ResponseOfMessageId,
                );
                if (callback) {
                    await callback(decoded);
                }
                break;
            }
            case CtResponseError: {
                // TODO: Eğer Observable geliyorsa ve düzgün content gelmiyorsa parse et
                const errorSide = decoded.ResponseErrorSide || 'E5';
                const errorMessage = `Response error from ${errorSide === 'E5' ? 'server' : 'client'}: ${decoded.Content}`;
                console.error(errorMessage);

                const callback = this.context.takeRequestCallback(
                    decoded.ResponseOfMessageId,
                );
                if (callback) {
                    await callback(decoded);
                }
                break;
            }
            default:
                break;
        }
    }

    clearProcessedEvents(): void {
        this.processedEventMessageIds.clear();
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

    private async processReceivedEvent(decoded: Payload): Promise<void> {
        const callbacks = this.context.getCallbacks(decoded.Subject!);
        const { instanceId, instanceGroup } =
            this.context.getInstanceIdentity();
        for (const callback of callbacks) {
            try {
                // console.debug('Processing received event for message:', decoded.MessageId);
                await callback(this.parseData(decoded.Content!));
                this.context.writePayload({
                    Command: CtConsumingSuccess,
                    Subject: decoded.Subject,
                    MessageId: decoded.MessageId,
                    InstanceGroup: instanceGroup,
                    InstanceId: instanceId,
                }).then(() => {
                    // console.debug('Successfully wrote consuming success payload for message:', decoded.MessageId);
                }).catch((error) => {
                    console.error('Failed to write consuming success payload for message:', decoded.MessageId, error);
                });
            } catch (error: any) {
                console.error(
                    'Error in event callback for subject ' +
                        decoded.Subject +
                        ':',
                    error,
                );
                this.context.writePayload({
                    Command: CtConsumingError,
                    Subject: decoded.Subject,
                    MessageId: decoded.MessageId,
                    InstanceGroup: instanceGroup,
                    InstanceId: instanceId,
                    Content: `Error in event callback: ${error instanceof Error ? error.message : String(error)}`,
                });
            }
        }
    }
}
