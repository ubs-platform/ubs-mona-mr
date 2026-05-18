import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MicroservicesCommonModule } from '@ubs-platform/microservice-setup-util';
import { NotifyWebserviceModule } from '@ubs-platform/notify-webservice';

@Module({
    imports: [
        MongooseModule.forRoot(
            `mongodb://${process.env.NX_MONGO_USERNAME}:${
                process.env.NX_MONGO_PASSWORD
            }@${process.env.NX_MONGO_URL || 'localhost'}/?authMechanism=DEFAULT`,
            {
                dbName: process.env.NX_MONGO_DBNAME || 'ubs_users',
            },
        ),
        NotifyWebserviceModule,

    ],
    exports: [
    ],
})
export class AppModule {}
