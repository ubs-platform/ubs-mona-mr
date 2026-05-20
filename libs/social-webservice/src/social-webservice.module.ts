import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { UserMicroserviceHelperModule } from '@ubs-platform/users-microservice-helper';
import { MicroservicesCommonModule, MicroserviceSetupUtil } from '@ubs-platform/microservice-setup-util';
import { SocialEntityMongoModule } from '@ubs-platform/social-entity-mongo';
import { CommentController } from './controller/comment.controller';
import { CommentAdminController } from './controller/comment-admin.controller';
import { ApplicationSocialRestrictionController } from './controller/application-social-restrictions.controller';
import { CommentMicroserviceController } from './controller/comment-microservice.controller';
import { CommentService } from './service/comment.service';
import { CommentMetaService } from './service/comment-meta.service';
import { CommentAbilityCheckService } from './service/comment-ability-check.service';
import { ApplicationSocialRestrictionService } from './service/application-social-restriction.service';
import { CommentMapper } from './mapper/comment.mapper';
import { UserIntercept } from './guard/UserIntercept';

@Module({
  imports: [
    SocialEntityMongoModule,
    UserMicroserviceHelperModule,
    MicroservicesCommonModule
    // ClientsModule.register([MicroserviceSetupUtil.setupClient('', 'KafkaClient')]),
    // MicroservicesCommonModule
  ],
  controllers: [
    CommentController,
    CommentAdminController,
    ApplicationSocialRestrictionController,
    CommentMicroserviceController,
  ],
  providers: [
    CommentService,
    CommentMapper,
    UserIntercept,
    CommentMetaService,
    CommentAbilityCheckService,
    ApplicationSocialRestrictionService,
  ],
  exports: [CommentService, CommentMetaService, ApplicationSocialRestrictionService],
})
export class SocialWebserviceModule {}
