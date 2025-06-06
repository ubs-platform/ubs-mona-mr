/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { MicroserviceSetupUtil } from '@ubs-platform/microservice-setup-util';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { LoadbalancedProxy } from '@ubs-platform/loadbalanced-proxy';

async function bootstrap() {
    // const app = await NestFactory.create(AppModule);
    await LoadbalancedProxy.runServer(async () => {
        const app = await NestFactory.create<NestFastifyApplication>(
            AppModule,
            new FastifyAdapter(),
        );
        const globalPrefix = 'api';
        app.connectMicroservice(
            MicroserviceSetupUtil.getMicroserviceConnection(''),
        );

        app.setGlobalPrefix(globalPrefix);
        const port = process.env.PORT || 3117;
        await app.startAllMicroservices();
        await app.listen(port, '0.0.0.0');
        Logger.log(
            `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
        );
    });
}

bootstrap();
