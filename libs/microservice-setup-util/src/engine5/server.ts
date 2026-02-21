// import { Module } from '@nestjs/common';
// import { ClientsModule, Transport } from '@nestjs/microservices';
// import { KafkaClient } from './kafka-client';

// @Module({
//   imports: [
//     ClientsModule.register([
//       { name: 'KAFKA_SERVICE', transport: Transport.CUSTOM, customClass: KafkaClient },
//     ]),
//   ],
// })
// export class AppModule {}

import {
    ClientOptions,
    MessageHandler,
    ReadPacket,
    Transport,
    WritePacket,
} from '@nestjs/microservices';
import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { Engine5Connection } from './connection';
import { from, Observable, ReplaySubject } from 'rxjs';
import { randomUUID } from 'crypto';
import { Connection } from 'mongoose';
import * as fs from 'fs';

export class E5NestServer extends Server implements CustomTransportStrategy {
    readonly id = randomUUID();
    connection: Engine5Connection;
    connectionIsReady = new ReplaySubject(1);
    /**
     *
     */
    constructor(
        private host: string,
        private port: string | number,
        private instanceGroup?: string,
        private instanceId?: string,
    ) {
        super();
        if (!instanceId) instanceId = 'nest_server' + randomUUID();

        this.connection = Engine5Connection.create({
            host,
            port,
            instanceId,
            instanceGroup: instanceGroup || 'nest_servers',
            tlsEnabled: true,
            authKey: process.env.E5_AUTH_SECRET || undefined,
            tlsOptions: {
                key: fs.readFileSync(process.env.E5_KEY_PATH || './certs/client.key'),
                cert: fs.readFileSync(process.env.E5_CERT_PATH || './certs/client.crt'),
                ca: fs.readFileSync(process.env.E5_CA_PATH || './certs/ca.crt'),
            },
        });
    }
    /**
     * Triggered when you run "app.listen()".
     */
    listen(callback: () => void) {
        //

        this.connection.init().then(() => {
            this.connectionIsReady.next(true);
            callback();
        });
    }

    on<
        EventKey extends string = string,
        EventCallback extends Function = Function,
    >(event: EventKey, callback: EventCallback) {
        this.connection.listen(event, callback as any);
    }

    /**
     * Triggered on application shutdown.
     */
    close() {
        this.connection.close();
    }

    // /**
    //  * You can ignore this method if you don't want transporter users
    //  * to be able to register event listeners. Most custom implusentations
    //  * will not need this.
    //  */
    // async on(event: string, callback: Function) {
    //
    //     await this.connection.listen(event, (a) => callback(a));
    // }

    /**
     * You can ignore this method if you don't want transporter users
     * to be able to retrieve the underlying native server. Most custom implementations
     * will not need this.
     */
    unwrap<T>() {
        return this.connection as T;
    }

    protected dispatchEvent(packet: ReadPacket<any>): Promise<any> {
        return this.connection.sendEvent(packet.pattern, packet.data);
    }

    protected publish(
        packet: ReadPacket<any>,
        callback: (packet: WritePacket<any>) => void,
    ): () => void {
        // this.logger.log(`Publish event: ${JSON.stringify(packet)}`);
        // // Simulate an immediate response for testing purposes
        // callback({ response: 'response' });
        // return () => {};
        this.connection
            .sendRequest(packet.pattern, packet.data)
            .then((response) => callback({ response }));
        return () => {};
    }

    addHandler(
        pattern: any,
        callback: MessageHandler,
        isEventHandler?: boolean,
        extras?: Record<string, any>,
    ): void {
        // console.info("addHandler: pattern,callback, isEventHandler, extras");
        // console.info(pattern,callback, isEventHandler, extras);
        let a = this.connectionIsReady.subscribe((isConnected) => {
            this.connection.listen(pattern, callback as any);
            a?.unsubscribe();
        });
    }
}
