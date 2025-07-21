/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { E5NestServer, MicroserviceSetupUtil } from '@ubs-platform/microservice-setup-util';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyMultipart from '@fastify/multipart';
import { detect } from 'detect-port';
import { ChildProcessWithoutNullStreams, fork, spawn } from 'child_process';

import { LoadbalancedProxy } from '@ubs-platform/loadbalanced-proxy';
async function bootstrap() {
    await LoadbalancedProxy.runServer(async () => {
        const port = parseInt(process.env.PORT!) || 3000;
        const app = await NestFactory.create<NestFastifyApplication>(
            AppModule,
            new FastifyAdapter(),
        );
        const globalPrefix = 'api';
        app.register(fastifyMultipart);
        app.connectMicroservice({
            strategy: new E5NestServer('localhost', '8080', 'tetakent-fileservice'),
        });
        app.setGlobalPrefix(globalPrefix);
        app.startAllMicroservices();
        await app.listen(port, '0.0.0.0');
        Logger.log(
            `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
        );
    });
}

bootstrap();
