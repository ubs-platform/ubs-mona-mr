import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class User {
    _id?: any;

    @Prop({
        unique: true,
        required: true,
    })
    username: string;

    @Prop({
        required: false,
    })
    passwordEncyripted: string;

    @Prop({
        required: true,
    })
    primaryEmail: string;

    @Prop({
        required: true,
    })
    name: string;

    @Prop({
        required: true,
    })
    surname: string;

    @Prop()
    country: string;

    @Prop()
    state: string;

    @Prop()
    city: string;

    @Prop()
    district: string;

    @Prop()
    gender: string;

    @Prop()
    pronounce: string;

    @Prop()
    roles: string[];

    @Prop()
    webSites: string[];

    @Prop({
        default: false,
    })
    active: boolean = false;

    @Prop({
        default: false,
    })
    suspended: boolean = false;

    @Prop({ type: String })
    suspendReason: string = '';

    @Prop({ required: false, type: String })
    activationKey?: string;

    @Prop({ required: false, type: Date })
    activationExpireDate?: Date | null;

    @Prop({})
    localeCode: string = '';
}

export type UserDoc = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
