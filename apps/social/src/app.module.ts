import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocialWebserviceModule } from '@ubs-platform/social-webservice';
import { MicroservicesCommonModule } from 'libs/microservice-setup-util/src/microservices-common.module';

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
        SocialWebserviceModule,

    ],
    exports: [
        
    ],
})
export class AppModule {}
