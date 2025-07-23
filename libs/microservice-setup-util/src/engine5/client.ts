import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';
import { Engine5Connection } from './connection';
import { from, Observable } from 'rxjs';
import { randomUUID } from 'crypto';

export class E5NestClient {
    static appGlobalE5InstanceId = 'nest_client' + randomUUID();
    connection: Engine5Connection;
    constructor({ host, port, instanceId }: { host: string, port: string | number, instanceId?: string }) {
        this.connection = Engine5Connection.create(
            host,
            port,
            instanceId || E5NestClient.appGlobalE5InstanceId
        );
    }

    subscribeToResponseOf(..._) {
        // noop
    }

    async connect(): Promise<any> {
        return new Promise((o, f) => {
            this.connection
                .init()
                .then((x) => o(x))
                .catch((err) => f(err));
        });
    }
    unwrap() {
        return this.connection as any;
    }

    emit<TResult = any, TInput = any>(
        pattern: any,
        data: TInput,
    ): Observable<TResult> {
        return from(
            this.connection.sendRequest(pattern, data),
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
