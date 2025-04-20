/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { MicroserviceSetupUtil } from '@ubs-platform/microservice-setup-util';
import { UsersModule } from './users.module';
import {
    NestFastifyApplication,
    FastifyAdapter,
} from '@nestjs/platform-fastify';
import { LoadbalancedProxy } from '@ubs-platform/loadbalanced-proxy';

export const INTERNAL_COMMUNICATION = {
    port: parseInt(process.env['U_USERS_MONA_INTERNAL_COM_PORT'] || '0'),
    host: process.env['U_USERS_MONA_INTERNAL_COM_HOST'],
};

async function bootstrap() {
    await LoadbalancedProxy.runServer(async () => {
        const app = await NestFactory.create<NestFastifyApplication>(
            UsersModule,
            new FastifyAdapter({
                ignoreTrailingSlash: true,
            }),
        );
        // const app = await NestFactory.create(UsersModule);
        console.info(
            'U_USERS_MONA_INTERNAL_COM_PORT: ' + INTERNAL_COMMUNICATION.port,
        );
        app.connectMicroservice(
            MicroserviceSetupUtil.getMicroserviceConnection('ubs-users'),
        );
        // app.connectMicroservice({
        //     transport: Transport.TCP,
        //     options: {
        //         port: INTERNAL_COMMUNICATION.port,
        //         host: '0.0.0.0',
        //     },
        // });
        const globalPrefix = 'api';
        app.setGlobalPrefix(globalPrefix);
        const port = process.env.PORT || 3000;
        await app.startAllMicroservices();
        await app.listen(port, '0.0.0.0');

        Logger.log(
            `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
        );
    });

    // }
}

bootstrap();
