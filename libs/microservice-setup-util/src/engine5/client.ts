import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';
import { Engine5Connection } from './connection';
import { from, Observable } from 'rxjs';
import { randomUUID } from 'crypto';

export class E5NestClient {
    connection: Engine5Connection;
    constructor() {
        this.connection = new Engine5Connection(
            'localhost',
            '8080',
            'nest_client' + randomUUID(),
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
        // this.connection.close();
    }
}
