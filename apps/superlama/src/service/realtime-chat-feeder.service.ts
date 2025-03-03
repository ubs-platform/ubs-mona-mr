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
import { Cron } from '@nestjs/schedule';

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

    @Cron('*/5 * * * * *')
    async handleCron() {
        const parallels = await this.chatSessionModel.countDocuments({
            llmAnswerStatus: 'CONTINUING',
        });
        if (parallels > 0) {
            console.debug('Waiting for complete one');
        } else {
            const waitings = await this.chatSessionModel.find({
                llmAnswerStatus: 'WAITING',
            });
            if (waitings.length > 0) {
                this.generateAnswer(waitings[0]._id);
            } else {
                console.debug('No waiting requests');
            }
        }
    }

    generateAnswer(sessionId: string) {
        return new Promise<void>(async (ok, fail) => {
            try {
                const allMsgs_ =
                    await this.findMessagesBySessionIdPaged(sessionId);
                const lastUserMessage = allMsgs_.find(
                    (a) => a.senderType == 'USER',
                );
                if (lastUserMessage) {
                    await this.setSessionStatus(sessionId, 'CONTINUING');

                    const allMsgs = allMsgs_
                        .reverse()
                        .map((a) => this.chatMapper.messageToDto(a));
                    let assistantMessage = new this.chatMessageModel({
                        sessionId: sessionId,
                        moderationNoteWarning: '',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        senderType: 'ASSISTANT',
                        textAssistantStage: 'ANSWER',
                        thoughtTextContent: '',
                        systemTextContent: '',
                        textContent: '',
                        assistantTargetMessageId: lastUserMessage._id,
                    } as Partial<ChatMessage>);
                    assistantMessage = await assistantMessage.save();

                    (lastUserMessage.textContent.trim().startsWith('test')
                        ? this.llmOpService.generateTestoResponse(allMsgs)
                        : this.llmOpService.generateResponse(allMsgs)
                    ).subscribe(async (a) => {
                        let msg = a.message.content;
                        if (msg.includes('<think>')) {
                            assistantMessage.textAssistantStage = 'THINKING';
                            msg = '';
                        } else if (msg.includes('</think>')) {
                            assistantMessage.textAssistantStage = 'ANSWER';
                            msg = '';
                        } else {
                            if (
                                assistantMessage.textAssistantStage == 'ANSWER'
                            ) {
                                assistantMessage.textContent += msg;
                            } else if (
                                assistantMessage.textAssistantStage ==
                                'THINKING'
                            ) {
                                assistantMessage.thoughtTextContent += msg;
                            }
                        }

                        assistantMessage = await assistantMessage.save();
                        const assistantStage =
                            assistantMessage.textAssistantStage;
                        const msgDto =
                            await this.chatMapper.messageToDto(
                                assistantMessage,
                            );
                        const data = {
                            ...msgDto,
                            textContent: assistantStage == 'ANSWER' ? msg : '',
                            thoughtTextContent:
                                assistantStage == 'THINKING' ? msg : '',
                            complete: a.done,
                            streamMode: 'APPEND',
                        };
                        this.kafkaClient.emit('llm-result', data);
                        if (a.done) {
                            try {
                                assistantMessage.textAssistantStage = 'DONE';
                                assistantMessage =
                                    await assistantMessage.save();
                                await this.setSessionStatus(
                                    sessionId,
                                    'FINISHED',
                                );
                                const completionData = {
                                    ...msgDto,
                                    textAssistantStage: 'DONE',
                                    textContent: '',
                                    thoughtTextContent: '',
                                    complete: a.done,
                                    streamMode: 'APPEND',
                                };
                                this.kafkaClient.emit(
                                    'llm-result',
                                    completionData,
                                );
                                ok();
                            } catch (e) {
                                console.error(e);
                                fail(e);
                            }
                        }
                    });
                } else {
                    ok();
                }
            } catch (error) {
                fail(error);
            }
        });
    }
    async setSessionStatus(
        sessionId: string,
        arg1: 'WAITING' | 'CONTINUING' | 'FINISHED',
    ) {
        const session = (await this.chatSessionModel
            .findById(sessionId)
            .exec())!;
        session.llmAnswerStatus = arg1;
        await session.save();
    }

    private async findMessagesBySessionIdPaged(
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
        return msgs;
    }
}
