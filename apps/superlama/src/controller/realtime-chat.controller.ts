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
import { filter, interval, map, Observable } from 'rxjs';

@Controller('realtime-chat')
export class RealtimeChatController {
    /**
     *
     */
    constructor(private realtimeChatService: RealtimeChatService) {}

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

    @Sse('session/:id/listen')
    sse(@Param('id') sessionId: string): Observable<MessageEvent> {
        return this.realtimeChatService.sessionListenStreams.pipe(
            filter((a) => a.sessionId == sessionId),
            map((a) => ({
                data: a as ChatMessageStreamDTO,
            })),
        );
    }

    // @method is not needed here since we're not extending any class
}
