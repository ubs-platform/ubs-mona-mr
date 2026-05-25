import { NestFactory } from '@nestjs/core';
import { GreenhatModule } from './greenhat.module';

async function bootstrap() {
  const app = await NestFactory.create(GreenhatModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
