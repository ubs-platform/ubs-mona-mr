import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Sse,
    UseGuards,
    MessageEvent,
    Query,
} from '@nestjs/common';
import { RealtimeChatService } from '../service/realtime-chat.service';
import {
    CurrentUser,
    JwtAuthGuard,
} from '@ubs-platform/users-microservice-helper';
import { UserDTO } from '@ubs-platform/users-common';
import {
    ChatMessageStreamDTO,
    UserSendingMessageDto,
} from '@ubs-platform/superlama-common';
import { filter, interval, map, Observable, Subject } from 'rxjs';
import { EventPattern } from '@nestjs/microservices';
import { RealtimeChatFeederService } from '../service/realtime-chat-feeder.service';
import { LlmOperationService } from '../service/llm-operation.service';

@Controller('realtime-chat')
export class RealtimeChatController {
    sessionListenStreams = new Subject<ChatMessageStreamDTO>();
    /**
     *
     */
    constructor(
        private realtimeChatService: RealtimeChatService,
        private rcsFeeder: RealtimeChatFeederService,
    ) {}

    @UseGuards(JwtAuthGuard)
    @Post()
    async insertUserMessage(
        @Body() message: UserSendingMessageDto,
        @CurrentUser() user: UserDTO,
    ) {
        return await this.realtimeChatService.insertUserMessage(message, user);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    async findMessagesBySessionIdPaged(
        @Query('sessionId') sessionId: string,
        @Query('beforeDate') beforeDate?: string,
        @Query('lastChatMessageId') lastChatMessageId?: string,
    ) {
        return await this.realtimeChatService.findMessagesBySessionIdPaged(
            sessionId,
            beforeDate,
            lastChatMessageId,
        );
    }

    @EventPattern('llm-result')
    async llmResulting(a: ChatMessageStreamDTO) {
        console.info('llm result kafka', a.textContent);
        await this.rcsFeeder.saveGeneratedAnswer(a);
        await this.sessionListenStreams.next(a);
    }

    @Sse('session/:id/listen')
    sse(@Param('id') sessionId: string): Observable<MessageEvent> {
        return this.sessionListenStreams.pipe(
            filter((a) => a.sessionId == sessionId),
            map((a) => ({
                data: a as ChatMessageStreamDTO,
            })),
        );
    }

    // @method is not needed here since we're not extending any class
}
