import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseEntity } from '@ubs-platform/entity-base';
import { randomUUID } from 'crypto';

@Schema()
export class PwResetRequest extends BaseEntity {
  @Prop({
    type: String,
    default: function genUUID() {
      return randomUUID();
    },
  })
  _id: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  expireAfter: Date;
}

export const PwResetRequestSchema =
  SchemaFactory.createForClass(PwResetRequest);
