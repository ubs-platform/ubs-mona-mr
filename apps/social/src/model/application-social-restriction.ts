import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CommentTotalCacheMapItem } from './comment-total-cache-map';
@Schema()
export class ApplicationSocialRestriction {
  _id: String;

  @Prop(String)
  userId: string;

  @Prop(String)
  restriction: 'COMMENT' | 'POST';

  @Prop(Date)
  until: Date;

  @Prop(Boolean)
  endless: boolean;

  @Prop(String)
  note: string;
}

export const ApplicationSocialRestrictionSchema = SchemaFactory.createForClass(
  ApplicationSocialRestriction
);
