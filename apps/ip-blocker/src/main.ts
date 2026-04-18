import { NestFactory } from '@nestjs/core';
import { IpBlockerModule } from './ip-blocker.module';
import { getIpBlockerConfig } from './ip-blocker.config';

async function bootstrap() {
  const config = getIpBlockerConfig();
  const app = await NestFactory.create(IpBlockerModule);
  await app.listen(config.port);
}
bootstrap();
