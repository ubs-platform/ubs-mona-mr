import { Body, Controller, Post } from '@nestjs/common';
import { GlobalVariableService } from '../service/global-variable.service';
import { EmailService } from '../service/email.service';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { EmailDto } from '@ubs-platform/notify-common';

@Controller('email')
export class EmailController {
    constructor(public s: EmailService) {}

    @Post()
    public async sendEmail(@Body() mail: EmailDto) {
        await this.s.sendWithTemplate(mail);
    }

    @EventPattern('email-reset')
    public async sendMailBg(@Payload() mail: EmailDto) {
        console.info('Send mail request to ' + mail.to);
        await this.s.sendWithTemplate(mail);
    }
}
