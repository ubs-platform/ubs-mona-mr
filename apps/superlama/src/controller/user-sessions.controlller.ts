import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RealtimeChatService } from '../service/realtime-chat.service';
import { SessionService } from '../service/session.service';
import {
    CurrentUser,
    JwtAuthGuard,
} from '@ubs-platform/users-microservice-helper';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';

@Controller('session')
export class SessionController {
    constructor(private sessionService: SessionService) {}

    @Get('current-user')
    @UseGuards(JwtAuthGuard)
    async searchUserSessions(
        @CurrentUser() currentUser: UserAuthBackendDTO,
        @Query('size') size = 0,
        @Query('page') page = 1,
    ) {
        return await this.sessionService.listSessions(currentUser, size, page);
    }
}
