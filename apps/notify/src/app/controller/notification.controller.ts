import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { GlobalVariableService } from '../service/global-variable.service';
import { EmailService } from '../service/email.service';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { EmailDto, NotificationDto } from '@ubs-platform/notify-common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, JwtAuthGuard } from '@ubs-platform/users-microservice-helper';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';
import { NotificationService } from '../service/notification.service';

@Controller('notification')
export class NotificationController {
    constructor(public s: NotificationService) {}

    @Get('/unread')
    @UseGuards(JwtAuthGuard)
    public async getUnreadNotifications(@CurrentUser() user: UserAuthBackendDTO, @Query('fromDate') fromDateStr: string, @Query('untilDate') untilDateStr: string, @Query('non-critical') nonCritical?: string): Promise<NotificationDto[]>  { 
        const nonCriticalFlag = nonCritical === 'true';
        if (nonCriticalFlag === false) {
            // For critical notifications, we can set a very early fromDate to get all critical notifications
            fromDateStr = '1970-01-01T00:00:00.000Z';
        }
        const fromDate = new Date(fromDateStr);
        const untilDate = new Date(untilDateStr);
        return this.s.getUnreadNotifications(user.id, fromDate, untilDate, nonCriticalFlag);
    }

    @EventPattern('notification-send')
    public async sendNotificationBg(@Payload() notificationDto: NotificationDto) {
        console.info('Send notification request to ' + notificationDto.recipientUserId);
        await this.s.addNotification(notificationDto);
    }


    // @Post()
    // public async sendEmail(@Body() mail: EmailDto) {
    //     await this.s.sendWithTemplate(mail);
    // }

    // @EventPattern('email-reset')
    // public async sendMailBg(@Payload() mail: EmailDto) {
    //     console.info('Send mail request to ' + mail.to);
    //     await this.s.sendWithTemplate(mail);
    // }
}
