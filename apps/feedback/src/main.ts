/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { MicroserviceSetupUtil } from '@ubs-platform/microservice-setup-util';
import { Transport } from '@nestjs/microservices';
export const INTERNAL_COMMUNICATION = {
    port: parseInt(process.env['U_FEEDBACK_MONA_INTERNAL_COM_PORT'] || '0'),
    host: process.env['U_FEEDBACK_MONA_INTERNAL_COM_HOST'],
};

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const globalPrefix = 'api';
    app.connectMicroservice(
        MicroserviceSetupUtil.getMicroserviceConnection(''),
    );
    app.connectMicroservice({
        transport: Transport.TCP,
        options: {
            port: INTERNAL_COMMUNICATION.port,
            host: '0.0.0.0',
        },
    });
    app.setGlobalPrefix(globalPrefix);
    const port = process.env.PORT || 3169;
    await app.startAllMicroservices();
    await app.listen(port, '0.0.0.0');
    Logger.log(
        `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
    );
}

bootstrap();
