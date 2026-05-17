import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Reaction {
  _id: String;

  @Prop(String)
  entityGroup: String;

  @Prop(String)
  entityName: String;

  @Prop(String)
  entityId: String;

  @Prop(String)
  byUserId: String;

  @Prop(String)
  byFullName: String;

  @Prop({ type: Date, default: new Date() })
  date: Date;
}

export const ReactionSchema = SchemaFactory.createForClass(Reaction);
