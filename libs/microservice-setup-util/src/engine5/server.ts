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

import { ClientOptions, Transport } from '@nestjs/microservices';
import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { Engine5Connection } from './connection';
import { from, Observable } from 'rxjs';
import { randomUUID } from 'crypto';

export class E5NestServer extends Server implements CustomTransportStrategy {
  readonly id = randomUUID()
  connection: Engine5Connection;
  /**
   *
   */
  constructor(connection: Engine5Connection) {
    super();
    if (connection == null) {
      // 
    } else {
      this.connection = connection
    }
  }
  /**
   * Triggered when you run "app.listen()".
   */
  listen(callback: () => void) {
    // 
    this.connection.init().then(() => { callback() })

  }

  /**
   * Triggered on application shutdown.
   */
  close() {
    // this.connection.close();
  }

  /**
   * You can ignore this method if you don't want transporter users
   * to be able to register event listeners. Most custom implementations
   * will not need this.
   */
  async on(event: string, callback: Function) {
    // 
    await this.connection.listen(event, () => callback())
  }

  /**
   * You can ignore this method if you don't want transporter users
   * to be able to retrieve the underlying native server. Most custom implementations
   * will not need this.
   */
  unwrap() {
    return this.connection as any;
  }

  emit(event: string, data: any) {
    this.connection.sendEvent(event, data)
  }
}