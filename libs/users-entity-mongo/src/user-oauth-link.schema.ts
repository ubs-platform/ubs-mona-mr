import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Connects a local user to an account at an external identity provider.
 * A user may hold several links, including more than one per provider.
 */
@Schema()
export class UserOAuthLink {
    _id?: any;

    @Prop({ required: true, type: String })
    userId!: string;

    /** Provider name, for example `google`. */
    @Prop({ required: true, type: String })
    provider!: string;

    /** The provider's stable account identifier (the OIDC `sub` claim). */
    @Prop({ required: true, type: String })
    subject!: string;

    /** E-mail reported by the provider when linked; informational only. */
    @Prop({ type: String })
    email?: string;

    @Prop({ required: true, type: Date })
    linkedAt!: Date;

    @Prop({ type: Date })
    lastLoginAt?: Date;
}

export const UserOAuthLinkSchema = SchemaFactory.createForClass(UserOAuthLink);
UserOAuthLinkSchema.index({ provider: 1, subject: 1 }, { unique: true });
UserOAuthLinkSchema.index({ userId: 1 });
