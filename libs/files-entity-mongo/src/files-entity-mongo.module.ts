import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileModel, FileSchema } from './file.schema';
import { EntityProperty, EntityPropertySchema } from './entity-property.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FileModel.name, schema: FileSchema },
      { name: EntityProperty.name, schema: EntityPropertySchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class FilesEntityMongoModule {}
