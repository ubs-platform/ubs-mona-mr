import { Module } from '@nestjs/common';
import { RealtimeChatController } from './controller/realtime-chat.controller';
import { RealtimeChatService } from './service/realtime-chat.service';
import { ChatMessageMapper } from './mapper/chat-message.mapper';
import { Mongoose } from 'mongoose';
import { MongooseModule } from '@nestjs/mongoose';

import { ChatSession, ChatSessionSchema } from './model/chat-session.model';
import { LlmOperationService } from './service/llm-operation.service';
import { BackendJwtUtilsModule } from '@ubs-platform/users-microservice-helper';
import { ChatMessage, ChatMessageSchema } from './model/chat-message-model';
import { MicroserviceSetupUtil } from '@ubs-platform/microservice-setup-util';
import { ClientsModule } from '@nestjs/microservices';
import { RealtimeChatFeederService } from './service/realtime-chat-feeder.service';
import { ScheduleModule } from '@nestjs/schedule';
import { SessionService } from './service/session.service';
import { SessionController } from './controller/user-sessions.controlller';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        MongooseModule.forRoot(
            `mongodb://${process.env.NX_MONGO_USERNAME}:${
                process.env.NX_MONGO_PASSWORD
            }@${process.env.NX_MONGO_URL || 'localhost'}/?authMechanism=DEFAULT`,
            {
                dbName: process.env.NX_MONGO_DBNAME || 'ubs_users',
            },
        ),
        MongooseModule.forFeature([
            { name: ChatMessage.name, schema: ChatMessageSchema },
            { name: ChatSession.name, schema: ChatSessionSchema },
        ]),
        BackendJwtUtilsModule,
        ClientsModule.register([
            {
                name: 'KAFKA_CLIENT',
                ...MicroserviceSetupUtil.getMicroserviceConnection(''),
            } as any,
        ]),
    ],
    controllers: [RealtimeChatController, SessionController],
    providers: [
        RealtimeChatService,
        ChatMessageMapper,
        LlmOperationService,
        RealtimeChatFeederService,
        SessionService,
    ],
})
export class SuperlamaModule {}
