import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class User {
    _id?: any;

    @Prop({
        unique: true,
        required: true,
    })
    username!: string;

    @Prop({
        required: false,
    })
    passwordEncyripted!: string;

    @Prop({
        required: true,
    })
    primaryEmail!: string;

    @Prop({
        required: true,
    })
    name!: string;

    @Prop({
        required: true,
    })
    surname!: string;

    @Prop({ type: String })
    country!: string;

    @Prop({ type: String })
    state!: string;

    @Prop({ type: String })
    city!: string;

    @Prop({ type: String })
    district!: string;

    @Prop({ type: String })
    gender!: string;

    @Prop({ type: String })
    pronounce!: string;

    @Prop({ type: [String] })
    roles!: string[];

    @Prop({ type: [String] })
    webSites!: string[];

    @Prop({
        default: false,
    })
    active!: boolean;

    @Prop({
        default: false,
    })
    suspended!: boolean;

    @Prop({ type: String })
    suspendReason!: string;

    @Prop({ required: false, type: String })
    activationKey?: string;

    @Prop({ required: false, type: Date })
    activationExpireDate?: Date | null;

    @Prop({ type: String })
    localeCode!: string;
}

export type UserDoc = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
