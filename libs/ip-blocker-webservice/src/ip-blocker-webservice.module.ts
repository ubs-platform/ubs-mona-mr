import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IpBlockerEntityMongoModule } from '@ubs-platform/ip-blocker-entity-mongo';
import { IpBlockerController } from './ip-blocker.controller';
import { IpBlockerService } from './ip-blocker.service';
import { FirewallAdapterService } from './firewall-adapter.service';
import { LogWatcherService } from './log-watcher.service';

@Module({
  imports: [IpBlockerEntityMongoModule],
  controllers: [IpBlockerController],
  providers: [IpBlockerService, FirewallAdapterService, LogWatcherService],
  exports: [IpBlockerService],
})
export class IpBlockerWebserviceModule {}
