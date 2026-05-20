import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { UserMicroserviceHelperModule } from '@ubs-platform/users-microservice-helper';
import { MicroservicesCommonModule, MicroserviceSetupUtil } from '@ubs-platform/microservice-setup-util';
import { SuperlamaEntityMongoModule } from '@ubs-platform/superlama-entity-mongo';
import { RealtimeChatController } from './controller/realtime-chat.controller';
import { SessionController } from './controller/user-sessions.controlller';
import { LlmModelsController } from './controller/llm-models.controller';
import { RealtimeChatService } from './service/realtime-chat.service';
import { RealtimeChatFeederService } from './service/realtime-chat-feeder.service';
import { SessionService } from './service/session.service';
import { LlmOperationService } from './service/llm-operation.service';
import { ChatMessageMapper } from './mapper/chat-message.mapper';

@Module({
  imports: [
    SuperlamaEntityMongoModule,
    ScheduleModule,
    UserMicroserviceHelperModule,
    MicroservicesCommonModule
  ],
  controllers: [RealtimeChatController, SessionController, LlmModelsController],
  providers: [
    RealtimeChatService,
    ChatMessageMapper,
    LlmOperationService,
    RealtimeChatFeederService,
    SessionService,
  ],
  exports: [RealtimeChatService, SessionService, LlmOperationService],
})
export class SuperlamaWebserviceModule { }
