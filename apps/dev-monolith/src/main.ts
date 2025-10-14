import { NestFactory } from '@nestjs/core';
import { DevMonolithModule } from './dev-monolith.module';
import { MicroserviceSetupUtil } from 'libs/microservice-setup-util/src/microservice-setup-util';
import { Logger } from '@nestjs/common';
import {
    NestFastifyApplication,
    FastifyAdapter,
} from '@nestjs/platform-fastify';
import { LoadbalancedProxy } from '@ubs-platform/loadbalanced-proxy';
import { UsersModule } from 'apps/users/src/users.module';

const INTERNAL_COMMUNICATION = {
    port: parseInt(process.env['U_USERS_MONA_INTERNAL_COM_PORT'] || '0'),
    host: process.env['U_USERS_MONA_INTERNAL_COM_HOST'],
};

async function bootstrap() {
    await LoadbalancedProxy.runServer(async () => {
        const app = await NestFactory.create<NestFastifyApplication>(
            DevMonolithModule,
            new FastifyAdapter({
                ignoreTrailingSlash: true,
            }),
        );
        // const app = await NestFactory.create(UsersModule);
        console.info(
            'U_USERS_MONA_INTERNAL_COM_PORT: ' + INTERNAL_COMMUNICATION.port,
        );

        app.connectMicroservice(
            MicroserviceSetupUtil.setupServer('ubs-dev-monolith'),
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
    // const app = await NestFactory.create(DevMonolithModule);
    // await app.listen(process.env.port ?? 3000);
}
bootstrap();
