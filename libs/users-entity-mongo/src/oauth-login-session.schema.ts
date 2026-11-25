import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';

/**
 * Short-lived server-side record of a verified provider identity that still
 * needs a registration or a password confirmation before login. Clients only
 * receive the `_id`; the identity itself is never accepted back from them.
 */
@Schema()
export class OAuthLoginSession {
    @Prop({
        type: String,
        default: function genUUID() {
            return randomUUID();
        },
    })
    _id!: string;

    @Prop({ required: true, type: String })
    provider!: string;

    @Prop({ required: true, type: String })
    subject!: string;

    @Prop({ required: true, type: String })
    email!: string;

    @Prop({ type: String })
    name?: string;

    @Prop({ type: String })
    surname?: string;

    @Prop({ type: String })
    picture?: string;

    /** Set when a local user already owns `email`; the session then needs a password to link. */
    @Prop({ type: String })
    existingUserId?: string;

    @Prop({ type: Number, default: 0 })
    linkAttempts!: number;

    @Prop({ required: true, type: Date })
    expireAfter!: Date;
}

export const OAuthLoginSessionSchema =
    SchemaFactory.createForClass(OAuthLoginSession);
// MongoDB removes the document once `expireAfter` has passed.
OAuthLoginSessionSchema.index({ expireAfter: 1 }, { expireAfterSeconds: 0 });
