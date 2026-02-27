import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum BanStatus {
  Active = 'active',
  Released = 'released',
}

@Schema({ collection: 'active_bans', timestamps: true })
export class ActiveBan {
  @Prop({ type: String, required: true, unique: true, index: true })
  ipAddress: string;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  point: number;

  @Prop({ type: String, required: true })
  reason: string;

  @Prop({ type: Date, required: true })
  penalizedAt: Date;

  @Prop({ type: Date, required: true, index: true })
  releaseAt: Date;

  @Prop({ type: Date, required: true, default: Date.now })
  lastSeenAt: Date;

  @Prop({
    type: String,
    enum: Object.values(BanStatus),
    default: BanStatus.Active,
    index: true,
  })
  status: BanStatus;
}

export type ActiveBanDoc = HydratedDocument<ActiveBan>;
export const ActiveBanSchema = SchemaFactory.createForClass(ActiveBan);

ActiveBanSchema.index({ status: 1, releaseAt: 1 });
