import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Document, Model } from 'mongoose';
import { Notification } from '../model/notification';
import { NotificationDto } from '@ubs-platform/notify-common';
import { Cron } from '@nestjs/schedule';
@Injectable()
export class NotificationService {
    // Service methods would go here
    /**
     *
     */
    constructor(
        @InjectModel(Notification.name)
        private notificationModel: Model<Notification>,
    ) {}

    public toDto(notification: Notification): NotificationDto {
        return {
            message: notification.message,
            recipientUserId: notification.recipientUserId,
            distributionSentAt: notification.distributionSentAt,
            isNonCritical: notification.isNonCritical,
        };
    }

    public async addNotification(
        notificationDto: NotificationDto,
    ): Promise<void> {
        let newNotification = new this.notificationModel(notificationDto);

        newNotification = await newNotification.save();
        await this.distributeNotification(newNotification);
        this.toDto(newNotification);
    }

    public async markAsRead(id: string): Promise<void> {
        await this.notificationModel.updateOne(
            { _id: id },
            { readedAt: new Date() },
        );
    }

    public async getUnreadNotifications(
        recipient: string,
        fromDate: Date,
        untilDate: Date,
        nonCritical?: boolean,
    ): Promise<NotificationDto[]> {
        const notifications = await this.notificationModel
            .find({
                recipientUserId: recipient,
                readedAt: null,
                createdAt: { $lte: untilDate, $gte: fromDate },
                isNonCritical: nonCritical != null ? nonCritical : false,
            })
            .exec();
        return notifications.map((n) => this.toDto(n));
    }

    distributeNotification(newNotification: Document<unknown, {}, Notification> & Notification & Required<{ _id: string; }> & { __v: number; }) {
        // Firebase or other push notification logic would go here
        
    }

}
