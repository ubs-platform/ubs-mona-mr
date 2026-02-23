import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';
import { Engine5Connection } from './connection';
import { from, Observable } from 'rxjs';
import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import * as fs from 'fs';

interface E5NestClientConnectionOptions {
    host: string;
    port: string | number;
    instanceId?: string;
    instanceGroup?: string;
}

export class E5NestClient {
    static appGlobalE5InstanceId = 'nest_client' + randomUUID();
    connection: Engine5Connection;
    constructor(private connectionInfo: E5NestClientConnectionOptions) {
        const { host, port, instanceId, instanceGroup } = connectionInfo;
        this.connection = Engine5Connection.create({
            host,
            port,
            instanceId: instanceId || E5NestClient.appGlobalE5InstanceId,
            instanceGroup: instanceGroup || 'nest_clients',
            tlsEnabled: process.env.E5_TLS_ENABLED === 'true',
            authKey: process.env.E5_AUTH_SECRET || undefined,
            tlsOptions: {
                key: fs.readFileSync(
                    process.env.E5_KEY_PATH || './certs/client.key',
                ),
                cert: fs.readFileSync(
                    process.env.E5_CERT_PATH || './certs/client.crt',
                ),
                ca: fs.readFileSync(
                    process.env.E5_CA_PATH || './certs/ca.crt',
                ),
            },
        });
        this.connection.init();
    }

    subscribeToResponseOf() {
        // noop
    }

    // async connect(): Promise<any> {
    //     return
    // }
    unwrap() {
        return this.connection as any;
    }

    emit<TResult = any, TInput = any>(
        pattern: any,
        data: TInput,
    ): Observable<TResult> {
        console.info('Sending event: ' + pattern);
        return from(
            this.connection.sendEvent(pattern, data),
        ) as Observable<TResult>;
    }

    send<TResult = any, TInput = any>(
        pattern: any,
        data: TInput,
    ): Observable<TResult> {
        return new Observable<TResult>((a) => {
            this.connection.sendRequest(pattern, data).then((result) => {
                a.next(result as TResult);
                a.complete();
            });
        });
    }

    async close() {
        await this.connection.close();
    }
}
