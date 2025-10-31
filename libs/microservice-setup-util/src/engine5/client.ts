import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';
import { Engine5Connection } from './connection';
import { from, Observable } from 'rxjs';
import { randomUUID } from 'crypto';
import { exec } from 'child_process';

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
        const { host, port, instanceId, instanceGroup } = connectionInfo
        this.connection = new Engine5Connection(
            host,
            port,
            instanceGroup || instanceId || E5NestClient.appGlobalE5InstanceId,
            E5NestClient.appGlobalE5InstanceId,
        );
        this.connection
            .init()
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
        console.info("Sending event: " + pattern)
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
