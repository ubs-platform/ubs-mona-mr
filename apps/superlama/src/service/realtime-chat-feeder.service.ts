import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ChatMessage } from '../model/chat-message-model';
import { Model } from 'mongoose';
import { ChatSession, ChatSessionDoc } from '../model/chat-session.model';
import {
    ChatMessageDTO,
    ChatMessageStreamDTO,
    TextAssitantStage,
    UserSendingMessageDto,
} from '@ubs-platform/superlama-common';
import { UserDTO } from '@ubs-platform/users-common';
import { ChatMessageMapper } from '../mapper/chat-message.mapper';
import { Subject } from 'rxjs';
import { LlmOperationService } from './llm-operation.service';
import { ClientKafka } from '@nestjs/microservices';
import { Cron } from '@nestjs/schedule';
import { exec } from 'child_process';

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

                    let assistantStage: TextAssitantStage = 'ANSWER';

                    (lastUserMessage.textContent.trim().startsWith('test')
                        ? this.llmOpService.generateTestoResponse(allMsgs)
                        : this.llmOpService.generateResponse(allMsgs)
                    ).subscribe(async (a) => {
                        let data = {
                            _id: assistantMessage._id,
                            sessionId,
                            streamMode: 'APPEND',
                            textContent: '',
                            thoughtTextContent: '',
                            senderType: 'ASSISTANT',
                        } as ChatMessageStreamDTO;

                        let msg = a.message.content || '';
                        if (msg.includes('<think>')) {
                            assistantStage = 'THINKING';
                            msg = '';
                        } else if (msg.includes('</think>')) {
                            assistantStage = 'ANSWER';
                            msg = '';
                        } else {
                            if (assistantStage == 'ANSWER') {
                                data.textContent = msg || '';
                            } else if (assistantStage == 'THINKING') {
                                data.thoughtTextContent = msg || '';
                            }
                        }
                        data.textAssistantStage = assistantStage;
                        this.kafkaClient.emit('llm-result', data);

                        if (a.done) {
                            this.kafkaClient.emit('llm-result', {
                                _id: assistantMessage._id,
                                sessionId,
                                textAssistantStage: 'DONE',
                                streamMode: 'APPEND',
                                senderType: 'ASSISTANT',
                            } as ChatMessageStreamDTO);
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

    async saveGeneratedAnswer(stream: ChatMessageStreamDTO) {
        let msg = await this.chatMessageModel.findById(stream._id);
        if (msg) {
            if (msg.textAssistantStage != 'DONE') {
                msg.textAssistantStage = stream.textAssistantStage;
                msg.textContent += stream.textContent || '';
                msg.thoughtTextContent += stream.thoughtTextContent || '';
            } else {
                console.warn(
                    "Session already completed but why come after done i don't know",
                );
            }
            await msg.save();

            if (msg.textAssistantStage == 'DONE') {
                // exec(`kdialog --msgbox "Chat statusu tamamlandı"`);
                await this.finishSession(this.chatMapper.messageToDto(msg));
            }
            console.info(msg.textAssistantStage);
        } else {
            throw new NotFoundException('ChatMessage', stream._id);
        }
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

    async finishSession(assistantMessage: ChatMessageDTO) {
        let subject = '';
        try {
            subject =
                await this.llmOpService.generateTitleLast(assistantMessage);
        } catch (ex) {
            console.error(ex);
            subject = assistantMessage.textContent.substring(0, 10);
        }

        const session = (await this.chatSessionModel
            .findById(assistantMessage.sessionId)
            .exec())!;
        session.llmAnswerStatus = 'FINISHED';
        session.subjectTitle = subject;
        await session.save();
    }

    // async setSessionSubjectTitle(sessionId: string, str: string) {

    //     session.subjectTitle = str;
    //     await session.save();
    // }

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
