import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ChatMessage } from '../model/chat-message-model';
import { Model } from 'mongoose';
import { ChatSession, ChatSessionDoc } from '../model/chat-session.model';
import {
    ChatMessageDTO,
    UserSendingMessageDto,
} from '@ubs-platform/superlama-common';
import { UserDTO } from '@ubs-platform/users-common';
import { ChatMessageMapper } from '../mapper/chat-message.mapper';

@Injectable()
export class RealtimeChatService {
    constructor(
        @InjectModel(ChatMessage.name)
        private chatMessageModel: Model<ChatMessage>,
        @InjectModel(ChatSession.name)
        private chatSessionModel: Model<ChatSession>,
        private chatMapper: ChatMessageMapper,
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
            senderType: 'USER',
            senderId: user.id,
            systemTextContent: '',
            textContent: dto.message,
        } as Partial<ChatMessage>);
        const msgSaved = await message.save();
        // add queue
        return await this.chatMapper.messageToDto(msgSaved);
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
            .limit(4);
        return msgs.map((a) => this.chatMapper.messageToDto(a));
    }
}
