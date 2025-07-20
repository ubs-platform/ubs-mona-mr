import { ClientProxy, ReadPacket, WritePacket } from "@nestjs/microservices";
import { Engine5Connection } from "./connection";
import { from, Observable } from "rxjs";

export class E5NestClient {

    constructor(private connection: Engine5Connection) {
    }

    subscribeToResponseOf(..._) {
        // noop
    }

    connect(): Promise<any> {
        return this.connection.init();
    }
    unwrap() {
        return this.connection as any
    }

    emit<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult> {
        return from(this.connection.sendRequest(pattern, data)) as Observable<TResult>

    }

    send<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult> {
        return new Observable<TResult>(a => {
            this.connection.sendRequest(pattern, data).then(result => {
                a.next(result as TResult);
                a.complete();
            })
        })
    }


    async close() {
        this.connection.close()
    }

}
