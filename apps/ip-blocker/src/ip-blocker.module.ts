import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IpBlockerWebserviceModule, getIpBlockerConfig } from '@ubs-platform/ip-blocker-webservice';
import { MicroservicesCommonModule } from '@ubs-platform/microservice-setup-util';

const ipBlockerConfig = getIpBlockerConfig();

@Module({
  imports: [
    MongooseModule.forRoot(ipBlockerConfig.mongodbUri),
    IpBlockerWebserviceModule,

  ],
  exports: [
  ],
})
export class IpBlockerModule { }
