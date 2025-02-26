import { NestFactory } from '@nestjs/core';
import { SuperlamaModule } from './superlama.module';
import { MicroserviceSetupUtil } from '@ubs-platform/microservice-setup-util';
import { Logger } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(SuperlamaModule);
    const globalPrefix = 'api';
    app.connectMicroservice(
        MicroserviceSetupUtil.getMicroserviceConnection(''),
    );
    app.setGlobalPrefix(globalPrefix);
    const port = process.env.PORT || 3000;
    app.startAllMicroservices();
    await app.listen(port);
    Logger.log(
        `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
    );
}
bootstrap();
