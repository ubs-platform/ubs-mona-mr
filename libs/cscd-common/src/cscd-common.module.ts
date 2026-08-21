import { Module } from '@nestjs/common';
import { CscdCommonService } from './cscd-common.service';

@Module({
  providers: [CscdCommonService],
  exports: [CscdCommonService],
})
export class CscdCommonModule {}
