import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { FileModel } from './file.schema';

@Schema()
export class EntityProperty {
  @Prop(String)
  category: String;

  @Prop(String)
  serviceTcpHost: String;

  @Prop(String)
  serviceTcpPort: String;
}

export type EntityPropertyDoc = EntityProperty & Document;
export const EntityPropertySchema =
  SchemaFactory.createForClass(EntityProperty);
