import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RealtimeChatService } from '../service/realtime-chat.service';
import {
    CurrentUser,
    JwtAuthGuard,
} from '@ubs-platform/users-microservice-helper';
import { UserDTO } from '@ubs-platform/users-common';
import { UserSendingMessageDto } from '@ubs-platform/superlama-common';

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
        @Param('sessionId') sessionId: string,
        @Param('beforeDate') beforeDate?: string,
        @Param('lastChatMessageId') lastChatMessageId?: string,
    ) {
        return await this.realtimeChatService.findMessagesBySessionIdPaged(
            sessionId,
            beforeDate,
            lastChatMessageId,
        );
    }

    // @method is not needed here since we're not extending any class
}
