import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class CommentFilterPattern {
    _id: String;

    @Prop({ type: String, required: true })
    pattern: string;

    @Prop({ type: String, required: true })
    type: 'REGEX' | 'STRING';

    @Prop({ type: String, required: true })
    flag: string;

    @Prop({ type: String, required: true })
    action:
        | 'FLAG_ONLY'
        | 'PENALTY_POINT'
        | 'SHADOW'
        | 'DROP'
        | 'REJECT_ERROR'
        | 'BAN_USER';

    @Prop({ type: Number })
    banDurationHours?: number;

    /** Boşsa global */
    @Prop({ type: String })
    entityGroup?: string;

    @Prop({ type: Boolean, default: false })
    obfuscationResistant: boolean;

    @Prop({ type: Boolean, default: true })
    enabled: boolean;

    @Prop({ type: String })
    note?: string;
}

export const CommentFilterPatternSchema =
    SchemaFactory.createForClass(CommentFilterPattern);
CommentFilterPatternSchema.index({ enabled: 1, entityGroup: 1 });
