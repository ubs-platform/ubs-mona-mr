import { Module } from '@nestjs/common';
import { CscdWebserviceService } from './service/cscd-webservice.service';
import { CscdEntityMongoModule } from '@ubs-platform/cscd-entity-mongo';
import { CscdController } from './controller/cscd.controller';
import { CacheManagerService } from '@ubs-platform/cache-manager';

@Module({
  controllers: [CscdController],
  providers: [CscdWebserviceService, CacheManagerService],
  exports: [CscdWebserviceService],
  imports: [CscdEntityMongoModule],
})
export class CscdWebserviceModule {}
