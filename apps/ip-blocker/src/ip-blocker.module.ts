import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IpBlockerController } from './ip-blocker.controller';
import { IpBlockerService } from './ip-blocker.service';
import { ActiveBan, ActiveBanSchema } from './model/entity-property.schema';
import { FirewallAdapterService } from './firewall-adapter.service';
import { LogWatcherService } from './log-watcher.service';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env['IP_BLOCKER_MONGODB_URI'] ??
        'mongodb://localhost:27017/ip-blocker',
    ),
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
