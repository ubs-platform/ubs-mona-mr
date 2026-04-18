import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IpBlockerController } from './ip-blocker.controller';
import { IpBlockerService } from './ip-blocker.service';
import { ActiveBan, ActiveBanSchema } from './model/entity-property.schema';
import { FirewallAdapterService } from './firewall-adapter.service';
import { LogWatcherService } from './log-watcher.service';
import { getIpBlockerConfig } from './ip-blocker.config';

const ipBlockerConfig = getIpBlockerConfig();

@Module({
  imports: [
    MongooseModule.forRoot(ipBlockerConfig.mongodbUri),
    MongooseModule.forFeature([
      {
        name: ActiveBan.name,
        schema: ActiveBanSchema,
      },
    ]),
  ],
  controllers: [IpBlockerController],
  providers: [IpBlockerService, FirewallAdapterService, LogWatcherService],
})
export class IpBlockerModule {}
