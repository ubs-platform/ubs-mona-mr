import { NestFactory } from '@nestjs/core';
import { SuperlamaModule } from './superlama.module';

async function bootstrap() {
  const app = await NestFactory.create(SuperlamaModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
