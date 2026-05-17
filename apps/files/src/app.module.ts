import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { FilesWebserviceModule } from '@ubs-platform/files-webservice';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        MongooseModule.forRoot(
            `mongodb://${process.env.NX_MONGO_USERNAME}:${process.env.NX_MONGO_PASSWORD
            }@${process.env.NX_MONGO_URL || 'localhost'}/?authMechanism=DEFAULT`,
            {
                dbName: process.env.NX_MONGO_DBNAME || 'ubs_files',
            },
        ),
        FilesWebserviceModule,
    ],
})
export class AppModule {}
