import { NestFactory } from '@nestjs/core';
import { CscdModule } from './cscd.module';

async function bootstrap() {
  const app = await NestFactory.create(CscdModule);
  await app.listen(process.env.port ?? process.env.PORT ?? 3000);
}
bootstrap();
