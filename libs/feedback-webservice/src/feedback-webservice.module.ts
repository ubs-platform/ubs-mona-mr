import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { BackendJwtUtilsModule } from '@ubs-platform/users-microservice-helper';
import { MicroserviceSetupUtil } from '@ubs-platform/microservice-setup-util';
import { FeedbackEntityMongoModule } from '@ubs-platform/feedback-entity-mongo';
import { UserMessageController } from './controller/user-messages.controller';
import { UserMessageService } from './service/user-message.service';
import { EmailService } from './service/email.service';

@Module({
  imports: [
    FeedbackEntityMongoModule,
    BackendJwtUtilsModule,
    ClientsModule.register([MicroserviceSetupUtil.setupClient('', 'KAFKA_CLIENT')]),
  ],
  controllers: [UserMessageController],
  providers: [UserMessageService, EmailService],
  exports: [UserMessageService],
})
export class FeedbackWebserviceModule {}
