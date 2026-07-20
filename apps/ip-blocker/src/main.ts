import { NestFactory } from '@nestjs/core';
import { IpBlockerModule } from './ip-blocker.module';

async function bootstrap() {
  const app = await NestFactory.create(IpBlockerModule);
  const portString = process.env['IP_BLOCKER_PORT'] || process.env['port'] || '3000';
  await app.listen(parseInt(portString));
}
bootstrap();
