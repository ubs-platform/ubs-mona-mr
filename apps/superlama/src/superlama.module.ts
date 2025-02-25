import { Module } from '@nestjs/common';
import { SuperlamaController } from './superlama.controller';
import { SuperlamaService } from './superlama.service';

@Module({
  imports: [],
  controllers: [SuperlamaController],
  providers: [SuperlamaService],
})
export class SuperlamaModule {}
