import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IpBlockerWebserviceModule, getIpBlockerConfig } from '@ubs-platform/ip-blocker-webservice';

const ipBlockerConfig = getIpBlockerConfig();

@Module({
  imports: [
    MongooseModule.forRoot(ipBlockerConfig.mongodbUri),
    IpBlockerWebserviceModule,
  ],
})
export class IpBlockerModule {}
