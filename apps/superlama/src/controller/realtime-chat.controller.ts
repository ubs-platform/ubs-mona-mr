import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
        // Call the service method and handle potential errors
        return await this.realtimeChatService.insertUserMessage(message, user);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    async findMessagesBySessionIdPaged(sessionId: string) {
        return await this.realtimeChatService.findMessagesBySessionIdPaged(
            sessionId,
        );
    }

    // @method is not needed here since we're not extending any class
}
