import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceSetupUtil } from '@ubs-platform/microservice-setup-util';
import { LoadbalancedProxy } from '@ubs-platform/loadbalanced-proxy';
import { GreenhatModule } from './greenhat.module';

async function bootstrap() {
  await LoadbalancedProxy.runServer(async () => {
    const app = await NestFactory.create(GreenhatModule);
    const globalPrefix = 'api';

    // Receives file-upload / file-volatility messages for GREENHAT_BLOG from ubs-files.
    app.connectMicroservice(MicroserviceSetupUtil.setupServer('ubs-greenhat'));

    app.setGlobalPrefix(globalPrefix);
    const port = process.env.PORT || 3092;
    await app.startAllMicroservices();
    await app.listen(port, '0.0.0.0');
    Logger.log(
      `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
    );
  });
}

bootstrap();
