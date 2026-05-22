import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseEntity } from '@ubs-platform/entity-base';

@Schema()
export class UserCandiate extends BaseEntity {
    _id?: any;

    @Prop(String)
    username: string;

    @Prop(String)
    passwordEncyripted: string;

    @Prop(String)
    primaryEmail: string;

    @Prop(String)
    name: string;

    @Prop(String)
    surname: string;

    @Prop(String)
    country: string;

    @Prop(String)
    state: string;

    @Prop(String)
    city: string;

    @Prop(String)
    district: string;

    @Prop(String)
    gender: string;

    @Prop(String)
    pronounce: string;

    @Prop([String])
    roles: string[];

    @Prop([String])
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
    expireDate?: Date | null;

    @Prop({})
    localeCode: string = '';
}

export type UserCandiateDoc = UserCandiate & Document;
export const UserCandiateSchema = SchemaFactory.createForClass(UserCandiate);
