import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Notification {
    _id: string;

    @Prop(String)
    message: string;

    @Prop(String)
    recipientUserId: string;

    @Prop(String)
    navigationLink: string;

    @Prop({ default: Date.now })
    createdAt: Date;

    @Prop({ default: null, type: Date })
    readedAt: Date | null = null;

    @Prop({ default: true })
    isNonCritical: boolean = true;

    @Prop({type: Date, default: null})
    distributionSentAt: Date | null = null;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
