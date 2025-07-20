import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { Engine5Connection } from './engine5/connection';
import { NestMicroserviceOptions } from '@nestjs/common/interfaces/microservices/nest-microservice-options.interface';
import { E5NestServer } from './engine5/server';
import { E5TransportBase } from './engine5/transportbase';

export class MicroserviceSetupUtil {
    static getMicroserviceConnection(instanceName) {
        const type = process.env['NX_MICROSERVICE_TYPE'] as 'KAFKA' | 'TCP' | "ENGINE5";
        if (!instanceName) {
            instanceName = 'tk' + randomUUID();
        }
        let microservice: MicroserviceOptions | null = null;
        if (type == 'KAFKA') {
            microservice = {
                transport: Transport.KAFKA,
                options: {
                    client: {
                        clientId: 'users',
                        brokers: [`${process.env['NX_KAFKA_URL']}`],
                    },
                    consumer: {
                        groupId: instanceName,
                    },
                },
            };
        } if (type == 'ENGINE5') {

            let e5base = new E5TransportBase(new Engine5Connection("localhost", "8080", instanceName))
            microservice = {
                strategy: e5base.asServer(),
                customClass: e5base.asClientClass(),
                options: e5base.connection
            } as any;
        } else {
            microservice = {
                transport: Transport.TCP,
                options: {
                    host: process.env['NX_TCP_HOST'],
                    port: parseInt(process.env['NX_TCP_PORT'] ?? "0"),
                },
            };
        }
        if (microservice == null) {
            throw 'Microservice type not recognized';
        }
        return microservice;
    }
    // export const UserMicroserviceCommunication =

    // // More 2 3 kafka clients are needed, comes replication invalid shit error
    // export const UserMicroserviceCommunication =
}
