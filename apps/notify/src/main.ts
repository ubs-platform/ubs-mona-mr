/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import {
    E5NestServer,
    MicroserviceSetupUtil,
} from '@ubs-platform/microservice-setup-util';
import { LoadbalancedProxy } from '@ubs-platform/loadbalanced-proxy';

async function bootstrap() {
    await LoadbalancedProxy.runServer(async () => {
        const app = await NestFactory.create(AppModule);
        const globalPrefix = 'api';
        // app.connectMicroservice({
        //     strategy: new E5NestServer('localhost', '8080', ''),
        // });
        app.connectMicroservice(MicroserviceSetupUtil.setupServer(''));

        app.setGlobalPrefix(globalPrefix);
        const port = process.env.PORT || 3169;
        await app.startAllMicroservices();
        await app.listen(port, '0.0.0.0');
        Logger.log(
            `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
        );
    });
}

bootstrap();
