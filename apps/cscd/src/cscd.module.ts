import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CscdWebserviceModule } from '@ubs-platform/cscd-webservice';

@Module({
  imports: [
    MongooseModule.forRoot(
      `mongodb://${process.env.NX_MONGO_USERNAME}:${process.env.NX_MONGO_PASSWORD
      }@${process.env.NX_MONGO_URL || 'localhost'}/?authMechanism=DEFAULT`,
      {
        dbName: process.env.NX_MONGO_DBNAME || 'ubs_cscd',
      },
    ),
    CscdWebserviceModule,
  ],
  controllers: [],
  providers: [],
})
export class CscdModule { }
