import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseEntity } from '@ubs-platform/entity-base';

@Schema()
export class EmailChangeRequest extends BaseEntity {
  _id?: any;

  @Prop()
  userId: string;
  @Prop()
  newEmail: string;
  @Prop()
  code: string;
  @Prop()
  expireAfter: Date;
}

export type EmailChangeRequestDocument = EmailChangeRequest & Document;
export const EmailChangeRequestSchema =
  SchemaFactory.createForClass(EmailChangeRequest);
