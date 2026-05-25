import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GreenhatWebserviceModule } from '@ubs-platform/greenhat-webservice';

@Module({
  imports: [
    MongooseModule.forRoot(
      `mongodb://${process.env.NX_MONGO_USERNAME}:${process.env.NX_MONGO_PASSWORD
      }@${process.env.NX_MONGO_URL || 'localhost'}/?authMechanism=DEFAULT`,
      {
        dbName: process.env.NX_MONGO_DBNAME || 'ubs_greenhat',
      },
    ),
    GreenhatWebserviceModule,
  ],
  controllers: [],
  providers: [],
})
export class GreenhatModule { }
