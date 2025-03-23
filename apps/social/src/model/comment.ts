import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class SocialComment {
    _id: String;

    @Prop(String)
    entityGroup: string;

    @Prop(String)
    mainEntityName: string;

    @Prop(String)
    mainEntityId: string;

    @Prop(String)
    childEntityName: string;

    @Prop(String)
    childEntityId: string;

    @Prop(String)
    textContent: string;

    @Prop(Boolean)
    isChild: boolean;

    @Prop(String)
    childOfCommentId: string;

    @Prop(String)
    byUserId: string;

    @Prop(String)
    byFullName: string;

    @Prop({ type: Date, default: new Date() })
    creationDate: Date;

    @Prop({ type: Date, default: new Date() })
    lastEditDate: Date;

    @Prop({ type: Number, default: 0 })
    editCount: number;

    @Prop({ type: Number, default: 0 })
    childCommentsCount: number;

    @Prop([String])
    upvoteUserIds: string[] = [];

    @Prop([String])
    downvoteUserIds: string[] = [];

    @Prop(Number)
    votesLength: number = 0;
}

export const SocialCommentSchema = SchemaFactory.createForClass(SocialComment);
