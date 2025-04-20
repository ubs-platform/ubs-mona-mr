import { NestFactory } from '@nestjs/core';
import { SuperlamaModule } from './superlama.module';
import { MicroserviceSetupUtil } from '@ubs-platform/microservice-setup-util';
import { Logger } from '@nestjs/common';
import { LoadbalancedProxy } from '@ubs-platform/loadbalanced-proxy';

async function bootstrap() {
    await LoadbalancedProxy.runServer(async () => {
        const app = await NestFactory.create(SuperlamaModule);
        const globalPrefix = 'api';
        app.connectMicroservice(
            MicroserviceSetupUtil.getMicroserviceConnection(''),
        );
        app.setGlobalPrefix(globalPrefix);
        const port = process.env.PORT || 3000;
        app.startAllMicroservices();
        await app.listen(port, '0.0.0.0');
        Logger.log(
            `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
        );
    });
}
bootstrap();
