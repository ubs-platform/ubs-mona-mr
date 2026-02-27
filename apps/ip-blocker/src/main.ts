import { NestFactory } from '@nestjs/core';
import { IpBlockerModule } from './ip-blocker.module';

async function bootstrap() {
  const app = await NestFactory.create(IpBlockerModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
