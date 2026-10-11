import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { decode, encode } from '@msgpack/msgpack';
import { EventEmitter, once } from 'events';
import * as net from 'net';
import { Engine5Connection } from './connection';
import { Payload } from './payload';

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function frame(payload: Payload): Buffer {
    const content = Buffer.from(encode(payload));
    const prefix = Buffer.alloc(4);
    prefix.writeUInt32BE(content.length);
    return Buffer.concat([prefix, content]);
}

describe('Engine5Connection message IDs', () => {
    let server: net.Server;
    let peer: net.Socket;
    let client: net.Socket;
    let connection: Engine5Connection;
    let messages: EventEmitter;

    beforeEach(async () => {
        jest.spyOn(console, 'info').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'debug').mockImplementation(() => {});
        const connect = jest.spyOn(net.Socket.prototype, 'connect');
        messages = new EventEmitter();
        server = net.createServer((socket) => {
            peer = socket;
            let buffered = Buffer.alloc(0);
            socket.on('data', (data: Buffer) => {
                buffered = Buffer.concat([buffered, data]);
                while (buffered.length >= 4) {
                    const length = buffered.readUInt32BE(0);
                    if (buffered.length < length + 4) {
                        break;
                    }
                    const payload = decode(buffered.subarray(4, length + 4)) as Payload;
                    buffered = buffered.subarray(length + 4);
                    if (payload.Command === 'CONNECT') {
                        socket.write(frame({ Command: 'CONNECT_SUCCESS' }));
                    }
                    messages.emit(payload.Command, payload);
                }
            });
        });
        server.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const address = server.address();
        if (!address || typeof address === 'string') {
            throw new Error('Expected a TCP server address');
        }
        connection = new Engine5Connection({
            host: '127.0.0.1',
            port: address.port,
        });
        await connection.init();
        client = connect.mock.instances[0];
    });

    afterEach(async () => {
        const closed = client && once(client, 'close');
        await connection?.close();
        await closed;
        peer?.destroy();
        if (server?.listening) {
            await new Promise<void>((resolve, reject) => {
                server.close((error) => error ? reject(error) : resolve());
            });
        }
        jest.restoreAllMocks();
    });

    it('sends distinct UUID v4 IDs for events without changing their content', async () => {
        const ids: string[] = [];
        for (let index = 0; index < 3; index++) {
            const received = once(messages, 'EVENT');
            await connection.sendEvent('test.event', { index });
            const [payload] = await received;
            expect(payload).toMatchObject({
                Command: 'EVENT',
                Subject: 'test.event',
                Content: JSON.stringify({ index }),
                MessageId: expect.stringMatching(uuidV4),
            });
            ids.push(payload.MessageId);
        }
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('matches responses by the UUID request ID', async () => {
        const received = once(messages, 'REQUEST');
        const result = connection.sendRequest('test.request', { input: true });
        const [request] = await received;
        expect(request.MessageId).toMatch(uuidV4);
        peer.write(frame({
            Command: 'RESPONSE',
            MessageId: 'legacy-response-id',
            ResponseOfMessageId: request.MessageId,
            Content: JSON.stringify({ output: true }),
        }));
        await expect(result).resolves.toEqual({ output: true });
    });

    it('generates UUIDs for listen commands and replies while preserving legacy request IDs', async () => {
        const listening = once(messages, 'LISTEN');
        await connection.listen('test.reply', (data) => ({ echoed: data }));
        const [listen] = await listening;
        expect(listen.MessageId).toMatch(uuidV4);

        const response = once(messages, 'RESPONSE');
        peer.write(frame({
            Command: 'REQUEST',
            Subject: 'test.reply',
            MessageId: '123456789_123456',
            Content: JSON.stringify('hello'),
        }));
        const [reply] = await response;
        expect(reply).toMatchObject({
            MessageId: expect.stringMatching(uuidV4),
            ResponseOfMessageId: '123456789_123456',
            Content: JSON.stringify({ echoed: 'hello' }),
        });
    });
});
