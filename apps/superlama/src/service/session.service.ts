import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ChatMessage } from '../model/chat-message-model';
import { Model } from 'mongoose';
import { ChatSession, ChatSessionDoc } from '../model/chat-session.model';
import {
    ChatMessageDTO,
    ChatMessageStreamDTO,
    ChatSessionDTO,
    UserSendingMessageDto,
} from '@ubs-platform/superlama-common';
import { UserAuthBackendDTO, UserDTO } from '@ubs-platform/users-common';
import { ChatMessageMapper } from '../mapper/chat-message.mapper';
import { Subject } from 'rxjs';
import { LlmOperationService } from './llm-operation.service';
import { ClientKafka } from '@nestjs/microservices';
import { RealtimeChatFeederService } from './realtime-chat-feeder.service';
import { SearchResult } from '@ubs-platform/crud-base-common';
import { SearchUtil } from '@ubs-platform/crud-base';

@Injectable()
export class SessionService {
    // public

    constructor(
        @InjectModel(ChatSession.name)
        private chatSessionModel: Model<ChatSession>,
    ) {}

    async listSessions(
        user: UserAuthBackendDTO,
        size: number,
        page: number,
    ): Promise<SearchResult<ChatSessionDTO>> {
        return (
            await SearchUtil.modelSearch<ChatSession>(
                this.chatSessionModel,
                size,
                page,
                {
                    $match: {
                        userParticipantsIds: {
                            $in: [user.id],
                        },
                    },
                },
            )
        ).map((a) => this.sessionToDto(a));
    }

    private sessionToDto(a: ChatSession): ChatSessionDTO {
        return {
            _id: a._id,
            creationDate: a.creationDate,
            expirationDate: a.expirationDate,
            llmAnswerStatus: a.llmAnswerStatus,
            moderationNoteWarning: a.moderationNoteWarning,
            userParticipantsIds: a.userParticipantsIds,
            subjectTitle: a.subjectTitle,
        };
    }
}
