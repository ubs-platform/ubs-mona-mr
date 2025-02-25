import { Module } from '@nestjs/common';
import { SuperlamaCommonService } from './superlama-common.service';

@Module({
  providers: [SuperlamaCommonService],
  exports: [SuperlamaCommonService],
})
export class SuperlamaCommonModule {}
