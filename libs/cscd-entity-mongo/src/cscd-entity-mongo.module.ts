import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Locality, Subdivision, Country, CountrySchema, LocalitySchema, SubdivisionSchema } from './country.schema';

@Module({
  providers: [
  ],
  exports: [MongooseModule],
  imports: [
    MongooseModule.forFeature([
      { name: Country.name, schema: CountrySchema },
      { name: Subdivision.name, schema: SubdivisionSchema },
      { name: Locality.name, schema: LocalitySchema },
    ]),]
})
export class CscdEntityMongoModule { }
