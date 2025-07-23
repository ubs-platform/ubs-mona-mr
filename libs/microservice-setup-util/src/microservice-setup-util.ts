import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { Engine5Connection } from './engine5/connection';
import { NestMicroserviceOptions } from '@nestjs/common/interfaces/microservices/nest-microservice-options.interface';
import { E5NestServer } from './engine5/server';
import { E5NestClient } from './engine5/client';

export class MicroserviceSetupUtil {
    static setupServer(instanceName) {
        instanceName = MicroserviceSetupUtil.generateInstanceNameIfNotExist(instanceName);
        const type = MicroserviceSetupUtil.TypeFromEnv();
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
        } else if (type == "ENGINE5") {
            microservice = {
                strategy: new E5NestServer(MicroserviceSetupUtil.e5hostEnvOrDef(), MicroserviceSetupUtil.e5PortEnvOrDef(), instanceName),
            }
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

    private static e5PortEnvOrDef(): string | number {
        return process.env['E5_PORT'] || 'localhost';

    }

    private static e5hostEnvOrDef(): string {
        return process.env['E5_HOST'] || 'localhost';
    }

    static setupClient(instanceName: string, moduleInjectionName: string) {
        const type = MicroserviceSetupUtil.TypeFromEnv();
        instanceName = MicroserviceSetupUtil.generateInstanceNameIfNotExist(instanceName);
        let microservice: any = null;
        if (type == 'KAFKA') {
            microservice = {
                name: moduleInjectionName,
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
        } else if (type == "ENGINE5") {
            microservice = {
                name: moduleInjectionName,
                customClass: E5NestClient,
                options: {
                    host: this.e5hostEnvOrDef(),
                    port: this.e5PortEnvOrDef(),
                    
                }
            } as any
        } else {
            microservice = {
                name: moduleInjectionName,
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


    private static generateInstanceNameIfNotExist(instanceName: any) {
        if (!instanceName) {
            instanceName = 'tk' + randomUUID();
        }
        return instanceName;
    }

    private static TypeFromEnv() {
        return process.env['NX_MICROSERVICE_TYPE'] as 'KAFKA' | 'TCP' | "ENGINE5";
    }
    // export const UserMicroserviceCommunication =

    // // More 2 3 kafka clients are needed, comes replication invalid shit error
    // export const UserMicroserviceCommunication =
}
