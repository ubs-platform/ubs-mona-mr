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
        const results = await this.chatSessionModel.aggregate([
            {
                $match: {
                    userParticipantsIds: {
                        $in: [user.id],
                    },
                },
            },
            {
                $facet: {
                    total: [{ $count: 'total' }],
                    data: [
                        { $skip: (size || 10) * (page || 0) },
                        // lack of convert to int
                        { $limit: parseInt(size as any as string) },
                        { $sort: { creationDate: -1 } },
                    ],
                },
            },
        ]);

        const maxItemLength = results[0].total[0].count;
        const content: ChatSessionDTO[] = (
            results[0].data as ChatSession[]
        ).map((a) => {
            return this.sessionToDto(a);
        });
        const itemLengthThing = Math.ceil(maxItemLength / size);
        const maxPagesIndex = size ? itemLengthThing - 1 : 0;
        return {
            content,
            page,
            size,
            maxItemLength,
            maxPagesIndex,
            lastPage: maxPagesIndex <= page,
            firstPage: page == 0,
        };
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
