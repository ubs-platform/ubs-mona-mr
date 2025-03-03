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
    ) {}

    async insertUserMessage(dto: UserSendingMessageDto, user: UserDTO) {
        let sessionId;
        if (dto.newSession) {
            let session = new this.chatSessionModel({
                userParticipantsIds: [user.id],
                moderationNoteWarning: '',
            });
            await session.save();
            sessionId = session._id!;
        } else {
            sessionId = dto.sessionId;
            // session = this.chatSessionModel.findById(dto.sessionId!).exec();
        }

        const message = new this.chatMessageModel({
            sessionId: sessionId,
            moderationNoteWarning: '',
            createdAt: new Date(),
            updatedAt: new Date(),
            senderType: 'USER',
            textAssistantStage: '',
            thoughtTextContent: '',
            senderId: user.id,
            systemTextContent: '',
            textContent: dto.message,
        } as Partial<ChatMessage>);
        const msgSaved = await message.save();
        const msgDto = await this.chatMapper.messageToDto(msgSaved);
        await this.generateAnswer(sessionId);
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
