import { Module } from '@nestjs/common';

import { BackendJwtUtilsModule } from '@ubs-platform/users-microservice-helper';
import { Mongoose } from 'mongoose';
import { MongooseModule } from '@nestjs/mongoose';
// import {
//   EmailTemplate,
//   EmailTemplateSchema,
// } from './model/email-template.model';
import { ClientsModule } from '@nestjs/microservices';
import { E5NestClient, MicroserviceSetupUtil } from '@ubs-platform/microservice-setup-util';
import { SocialCommentSchema, SocialComment } from './model/comment';
import { Reaction, ReactionSchema } from './model/reaction';
import { CommentController } from './controller/comment.controller';
import { CommentService } from './service/comment.service';
import { CommentMapper } from './mapper/comment.mapper';
import { UserIntercept } from './guard/UserIntercept';
import {
    SocialCommentMeta,
    SocialCommentMetaSchema,
} from './model/comment-meta';
import { CommentMetaService } from './service/comment-meta.service';
import { CommentAbilityCheckService } from './service/comment-ability-check.service';
import { CommentAdminController } from './controller/comment-admin.controller';
import {
    ApplicationSocialRestriction,
    ApplicationSocialRestrictionSchema,
} from './model/application-social-restriction';
import { ApplicationSocialRestrictionController } from './controller/application-social-restrictions.controller';
import { ApplicationSocialRestrictionService } from './service/application-social-restriction.service';
import { CommentMicroserviceController } from './controller/comment-microservice.controller';

@Module({
    imports: [
        BackendJwtUtilsModule,
        MongooseModule.forRoot(
            `mongodb://${process.env.NX_MONGO_USERNAME}:${
                process.env.NX_MONGO_PASSWORD
            }@${process.env.NX_MONGO_URL || 'localhost'}/?authMechanism=DEFAULT`,
            {
                dbName: process.env.NX_MONGO_DBNAME || 'ubs_users',
            },
        ),

        MongooseModule.forFeature([
            // { name: EmailTemplate.name, schema: EmailTemplateSchema },
            { name: SocialComment.name, schema: SocialCommentSchema },
            { name: Reaction.name, schema: ReactionSchema },
            { name: SocialCommentMeta.name, schema: SocialCommentMetaSchema },
            {
                name: ApplicationSocialRestriction.name,
                schema: ApplicationSocialRestrictionSchema,
            },
        ]),
        ClientsModule.register([MicroserviceSetupUtil.setupClient("", "KafkaClient")])

    ],
    controllers: [
        CommentController,
        CommentAdminController,
        ApplicationSocialRestrictionController,
        CommentMicroserviceController
    ],
    providers: [
        CommentService,
        CommentMapper,
        UserIntercept,
        CommentMetaService,
        CommentAbilityCheckService,
        ApplicationSocialRestrictionService,
    ],
})
export class AppModule {}
