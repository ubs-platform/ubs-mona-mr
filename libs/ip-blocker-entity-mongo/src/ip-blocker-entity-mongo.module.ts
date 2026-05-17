import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActiveBan, ActiveBanSchema } from './entity-property.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ActiveBan.name, schema: ActiveBanSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class IpBlockerEntityMongoModule {}
