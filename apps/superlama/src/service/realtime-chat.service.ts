import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ChatMessage } from '../model/chat-message-model';
import { Model } from 'mongoose';
import { ChatSession, ChatSessionDoc } from '../model/chat-session.model';
import {
    ChatMessageDTO,
    ChatMessageStreamDTO,
    UserSendingMessageDto,
} from '@ubs-platform/superlama-common';
import { UserDTO } from '@ubs-platform/users-common';
import { ChatMessageMapper } from '../mapper/chat-message.mapper';
import { Subject } from 'rxjs';
import { LlmOperationService } from './llm-operation.service';
import { ClientKafka } from '@nestjs/microservices';
import { RealtimeChatFeederService } from './realtime-chat-feeder.service';

@Injectable()
export class RealtimeChatService {
    // public

    constructor(
        @InjectModel(ChatMessage.name)
        private chatMessageModel: Model<ChatMessage>,
        @InjectModel(ChatSession.name)
        private chatSessionModel: Model<ChatSession>,
        private chatMapper: ChatMessageMapper,
        private llmOpService: LlmOperationService,
        @Inject('KAFKA_CLIENT') private kafkaClient: ClientKafka,
        private realChatFeeder: RealtimeChatFeederService,
    ) {}

    async insertUserMessage(dto: UserSendingMessageDto, user: UserDTO) {
        let session: ChatSessionDoc;
        if (dto.newSession) {
            session = new this.chatSessionModel({
                userParticipantsIds: [user.id],
                moderationNoteWarning: '',
            });
        } else {
            session = (await this.chatSessionModel
                .findById(dto.sessionId!)
                .exec())!;
        }
        session.llmAnswerStatus = 'WAITING';
        await session.save();

        const message = new this.chatMessageModel({
            sessionId: session.id,
            moderationNoteWarning: '',
            createdAt: new Date(),
            updatedAt: new Date(),
            senderType: 'USER',
            requestedLlmModel: dto.selectedLlm,
            textAssistantStage: '',
            thoughtTextContent: '',
            senderId: user.id,
            systemTextContent: '',
            textContent: dto.message,
        } as Partial<ChatMessage>);
        const msgSaved = await message.save();
        const msgDto = await this.chatMapper.messageToDto(msgSaved);

        // add queue
        return msgDto;
    }

    async findMessagesBySessionId(sessionId: string) {
        const msgs = await this.chatMessageModel.find({
            sessionId,
        });
        return msgs;
    }

    async findMessagesBySessionIdPaged(
        sessionId: string,
        beforeDate: String | Date = new Date(),
        lastChatMessageId?: String,
    ) {
        if (beforeDate instanceof Date) {
            beforeDate = beforeDate.toISOString();
        }
        const msgs = await this.chatMessageModel
            .find({
                sessionId,
                createdAt: {
                    $lte: beforeDate,
                },
                ...(lastChatMessageId
                    ? { _id: { $not: lastChatMessageId } }
                    : {}),
            })
            .sort({ createdAt: 'desc' })
            .limit(10)
            .exec();
        return msgs.map((a) => this.chatMapper.messageToDto(a));
    }
}
