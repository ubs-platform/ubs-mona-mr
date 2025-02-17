import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CommentTotalCacheMapItem } from './comment-total-cache-map';

@Schema()
export class SocialCommentMeta {
  _id: String;

  @Prop(String)
  entityGroup: string;

  @Prop(String)
  mainEntityName: string;

  @Prop(String)
  mainEntityId: string;

  @Prop(String)
  commentingStatus: 'ALLOW' | 'ARCHIVE' | 'DISABLE';

  @Prop([String])
  commentingDisabledUserIds: string[];

  @Prop([CommentTotalCacheMapItem])
  subItemLengths: CommentTotalCacheMapItem[] = [];
}

export const SocialCommentMetaSchema =
  SchemaFactory.createForClass(SocialCommentMeta);
