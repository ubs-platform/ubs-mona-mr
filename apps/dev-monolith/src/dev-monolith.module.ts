import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { DevMonolithController } from './dev-monolith.controller';
import { UsersWebserviceModule } from '@ubs-platform/users-webservice';
import { SocialWebserviceModule } from '@ubs-platform/social-webservice';
import { NotifyWebserviceModule } from '@ubs-platform/notify-webservice';
import { FeedbackWebserviceModule } from '@ubs-platform/feedback-webservice';
import { FilesWebserviceModule } from '@ubs-platform/files-webservice';
import { SuperlamaWebserviceModule } from '@ubs-platform/superlama-webservice';
import { IpBlockerWebserviceModule } from '@ubs-platform/ip-blocker-webservice';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        MongooseModule.forRoot(
            `mongodb://${process.env.NX_MONGO_USERNAME}:${
                process.env.NX_MONGO_PASSWORD
            }@${process.env.NX_MONGO_URL || 'localhost'}/?authMechanism=DEFAULT`,
            {
                dbName: process.env.NX_MONGO_DBNAME || 'ubs_users',
            },
        ),
        UsersWebserviceModule,
        SocialWebserviceModule,
        NotifyWebserviceModule,
        FeedbackWebserviceModule,
        FilesWebserviceModule,
        SuperlamaWebserviceModule,
        IpBlockerWebserviceModule,
    ],
    controllers: [DevMonolithController],
    providers: [],
})
export class DevMonolithModule {}

