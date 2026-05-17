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

    @Prop(String)
    ipAddress: string;
}

 const SocialCommentSchema = SchemaFactory.createForClass(SocialComment);

// Ana compound index - Tüm ana sorgu patternlerini kapsar (pattern 1, 2, 3)
// Pattern 1: {entityGroup, mainEntityName}
// Pattern 2: {entityGroup, mainEntityName, mainEntityId}
// Pattern 3: {entityGroup, mainEntityName, mainEntityId, childEntityName, childEntityId}
SocialCommentSchema.index({ 
    entityGroup: 1, 
    mainEntityName: 1, 
    mainEntityId: 1, 
    childEntityName: 1, 
    childEntityId: 1 
});

// Parent yorumun altındaki child yorumları getirmek için
SocialCommentSchema.index({ childOfCommentId: 1, isChild: 1 });

// Kullanıcının yorumlarını tarihe göre sıralı getirmek için
SocialCommentSchema.index({ byUserId: 1, creationDate: -1 });
export {SocialCommentSchema};