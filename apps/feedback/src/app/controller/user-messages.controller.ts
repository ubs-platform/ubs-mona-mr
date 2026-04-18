import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import { UserMessage } from '../model/user-message.model';
import { UserMessageService } from '../service/user-message.service';
import { ClientKafka, MessagePattern } from '@nestjs/microservices';
import {
    BaseCrudController,
    ControllerConfiguration,
    CrudControllerConfig,
} from '@ubs-platform/crud-base';
import {
    IUserMessageDto,
    IUserMessageSearch,
} from '@ubs-platform/feedback-common';

@Controller('user-message')
@CrudControllerConfig({
    authorization: {
        ADD: { needsAuthenticated: false },
        ALL: { roles: ['ADMIN'] },
    },
})
export class UserMessageController extends BaseCrudController<
    UserMessage,
    string,
    IUserMessageDto,
    IUserMessageDto,
    IUserMessageSearch
> {
    constructor(
        private userMsgService: UserMessageService,
        @Inject('KAFKA_CLIENT') private kafkaClient: ClientKafka,
    ) {
        super(userMsgService);

        // this.kafkaClient.emit('register-category', {
        //     category: 'USER_MESSAGE',
        //     serviceTcpHost: process.env['U_FEEDBACK_MONA_INTERNAL_COM_HOST'],
        //     serviceTcpPort: process.env['U_FEEDBACK_MONA_INTERNAL_COM_PORT'],
        // });
    }

    @Post(':id/resolve')
    async resolve(
        @Param() { id }: { id: string },
        @Body() { reply }: { reply: string },
    ): Promise<IUserMessageDto> {
        return await this.userMsgService.resolve(id, reply);
    }

    @MessagePattern('file-upload-USER_MESSAGE')
    async insertQuestionMedia() {
        const name = new Date().toISOString(),
            category = 'USER_MESSAGE';
        return {
            category,
            name,
            volatile: true,
            durationMiliseconds: 15552000000,
            maxLimitBytes: 30000000,
        };
    }
}
