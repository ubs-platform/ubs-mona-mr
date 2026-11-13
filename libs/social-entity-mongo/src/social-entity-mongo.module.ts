import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocialComment, SocialCommentSchema } from './comment';
import { Reaction, ReactionSchema } from './reaction';
import { SocialCommentMeta, SocialCommentMetaSchema } from './comment-meta';
import { ApplicationSocialRestriction, ApplicationSocialRestrictionSchema } from './application-social-restriction';
import { CommentFilterPattern, CommentFilterPatternSchema } from './comment-filter-pattern';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SocialComment.name, schema: SocialCommentSchema },
      { name: Reaction.name, schema: ReactionSchema },
      { name: SocialCommentMeta.name, schema: SocialCommentMetaSchema },
      { name: CommentFilterPattern.name, schema: CommentFilterPatternSchema },
      { name: ApplicationSocialRestriction.name, schema: ApplicationSocialRestrictionSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class SocialEntityMongoModule {}
