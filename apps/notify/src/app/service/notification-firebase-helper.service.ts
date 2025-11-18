import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FcmTokenUserModel } from "../model/fcm-token-user.model";
import { Model } from "mongoose";
import * as firebase from 'firebase-admin';

@Injectable()
export class FirebaseNotificationHelperService {

    constructor(@InjectModel(FcmTokenUserModel.name) private fcmTokenUserModel: Model<FcmTokenUserModel>) {}

    public async sendPushNotification(
        recipientUserId: string,
        message: string,
        navigationLink?: string,
    ): Promise<void> {
        const tokens = await this.fcmTokenUserModel
            .find({ userId: recipientUserId })
            .exec();

        for (const tokenEntry of tokens) {
            const fcmToken = tokenEntry.fcmToken;
            await firebase.messaging().send({
                token: fcmToken,
                notification: {
                    title: 'New Notification',
                    body: message,
                },
                data: {
                    navigationLink: navigationLink || '',
                },
            });
        }
        // Logic to send push notification via Firebase would go here
    }

    public async registerUserIdToken(
        userId: string,
        fcmToken: string,
    ): Promise<void> {
        this.fcmTokenUserModel.updateOne(
            { userId: userId, fcmToken: fcmToken },
            { userId: userId, fcmToken: fcmToken },
            { upsert: true },
        ).exec();
        // Logic to register FCM token for a user would go here
    }
}