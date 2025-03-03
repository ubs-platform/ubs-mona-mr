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
export class RealtimeChatFeederService {
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

    generateAnswer(sessionId: string) {
        return new Promise<void>(async (ok, fail) => {
            try {
                const allMsgs_ =
                    await this.findMessagesBySessionIdPaged(sessionId);
                const msgDtoUser = allMsgs_.find((a) => a.senderType == 'USER');
                if (msgDtoUser) {
                    const userMsgStatus = 'FINISHED';
                    const userMessageFromSicak =
                        await this.chatMessageModel.findById(msgDtoUser._id);
                    userMessageFromSicak!.userMessageAnswerStatus =
                        userMsgStatus;
                    await userMessageFromSicak!.save();

                    const allMsgs = allMsgs_.reverse();
                    const message = new this.chatMessageModel({
                        sessionId: sessionId,
                        moderationNoteWarning: '',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        senderType: 'ASSISTANT',
                        textAssistantStage: 'ANSWER',
                        thoughtTextContent: '',
                        systemTextContent: '',
                        textContent: '',
                        assistantTargetMessageId: msgDtoUser._id,
                    } as Partial<ChatMessage>);
                    const msgSaved = await message.save();
                    const msgDto = await this.chatMapper.messageToDto(msgSaved);

                    (msgDtoUser.textContent.trim().startsWith('test')
                        ? this.llmOpService.generateTestoResponse(allMsgs)
                        : this.llmOpService.generateResponse(allMsgs)
                    ).subscribe((a) => {
                        let msg = a.message.content;
                        if (msg.includes('<think>')) {
                            msgSaved.textAssistantStage = 'THINKING';
                            msg = '';
                        } else if (msg.includes('</think>')) {
                            msgSaved.textAssistantStage = 'ANSWER';
                            msg = '';
                        } else {
                            if (msgSaved.textAssistantStage == 'ANSWER') {
                                message.textContent += msg;
                            } else if (
                                msgSaved.textAssistantStage == 'THINKING'
                            ) {
                                message.thoughtTextContent += msg;
                            }
                        }
                        const stg = msgSaved.textAssistantStage;
                        message.save().then((v) => {
                            const data = {
                                ...msgDto,
                                textContent: stg == 'ANSWER' ? msg : '',
                                thoughtTextContent:
                                    stg == 'THINKING' ? msg : '',
                                complete: a.done,
                                streamMode: 'APPEND',
                            };
                            this.kafkaClient.emit('llm-result', data);
                            if (a.done) {
                                this.chatMessageModel
                                    .findById(msgDtoUser._id)
                                    .then(async (userMessageNew) => {
                                        if (userMessageNew) {
                                            userMessageNew.userMessageAnswerStatus =
                                                'FINISHED';
                                            await userMessageNew.save();
                                            ok();
                                        } else {
                                            fail(new NotFoundException());
                                        }
                                    });
                            }
                        });
                    });
                } else {
                    ok();
                }
            } catch (error) {
                fail(error);
            }
        });
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
