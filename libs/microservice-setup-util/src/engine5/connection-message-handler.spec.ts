import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { encode } from '@msgpack/msgpack';
import { Engine5ConnectionMessageHandler } from './connection-message-handler';
import { CallbackFunction } from './connection.types';
import { Payload } from './payload';

describe('Engine5 event message ID correlation', () => {
    const messageId = '55fb5b17-68ba-4bd7-8971-48f6de8766af';
    let callback: ReturnType<typeof jest.fn<CallbackFunction>>;
    let writePayload: ReturnType<typeof jest.fn<(payload: Payload) => Promise<void>>>;
    let handler: Engine5ConnectionMessageHandler;

    beforeEach(() => {
        jest.spyOn(console, 'info').mockImplementation(() => {});
        jest.spyOn(console, 'debug').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        callback = jest.fn<CallbackFunction>();
        writePayload = jest.fn<(payload: Payload) => Promise<void>>()
            .mockResolvedValue(undefined);
        handler = new Engine5ConnectionMessageHandler({
            clearConnectionTimeout: jest.fn(),
            setConnectionStatus: jest.fn(),
            destroySocket: jest.fn(),
            setInstanceIdentity: jest.fn(),
            getInstanceIdentity: () => ({
                instanceId: 'consumer',
                instanceGroup: 'consumers',
            }),
            getCallbacks: () => [callback],
            takeRequestCallback: () => undefined,
            generateMessageId: () => messageId,
            writePayload,
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    function event(id?: string): Buffer {
        return Buffer.from(encode({
            Command: 'EVENT',
            Subject: 'test.event',
            Content: JSON.stringify({ value: true }),
            ...(id ? { MessageId: id } : {}),
        }));
    }

    it.each([messageId, '123456789_123456'])(
        'preserves event ID %s in consumption success and deduplicates redelivery',
        async (id) => {
            await handler.processIncomingData(event(id));
            await handler.processIncomingData(event(id));
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith({ value: true });
            expect(writePayload).toHaveBeenCalledTimes(1);
            expect(writePayload).toHaveBeenCalledWith({
                Command: 'CONSUMING_SUCCESS',
                Subject: 'test.event',
                MessageId: id,
                InstanceId: 'consumer',
                InstanceGroup: 'consumers',
            });
        },
    );

    it('preserves the event ID in consumption errors', async () => {
        callback.mockImplementation(() => { throw new Error('Consumer failed'); });
        await handler.processIncomingData(event(messageId));
        expect(writePayload).toHaveBeenCalledWith({
            Command: 'CONSUMING_ERROR',
            Content: 'Error in event callback: Consumer failed',
            Subject: 'test.event',
            MessageId: messageId,
            InstanceId: 'consumer',
            InstanceGroup: 'consumers',
        });
    });

    it('continues to process legacy events without IDs', async () => {
        await handler.processIncomingData(event());
        await handler.processIncomingData(event());
        expect(callback).toHaveBeenCalledTimes(2);
    });
});
