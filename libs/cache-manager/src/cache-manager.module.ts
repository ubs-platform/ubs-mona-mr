import { Module } from '@nestjs/common';
import { CacheManagerService } from './cache-manager.service';
import { MICROSERVICE_CLIENT, MicroserviceSetupUtil } from "@ubs-platform/microservice-setup-util";
import { ClientsModule } from '@nestjs/microservices';
@Module({
  providers: [CacheManagerService],
  exports: [CacheManagerService],
  imports: [
    ClientsModule.register([MicroserviceSetupUtil.setupClient("", MICROSERVICE_CLIENT)]),
  ],
})
export class CacheManagerModule { }
