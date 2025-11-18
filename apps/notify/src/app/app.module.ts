import { Module } from '@nestjs/common';

import { BackendJwtUtilsModule } from '@ubs-platform/users-microservice-helper';
import { MongooseModule } from '@nestjs/mongoose';
import {
    EmailTemplate,
    EmailTemplateSchema,
} from './model/email-template.model';
import { EmailTemplateController } from './controller/email-template.controller';
import { EmailTemplateService } from './service/email-template.service';
import {
    GlobalVariable,
    GlobalVariableSchema,
} from './model/global-variable.model';
import { GlobalVariableService } from './service/global-variable.service';
import { GlobalVariableController } from './controller/global-variable.controller';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailController } from './controller/email-operation.controller';
import { EmailService } from './service/email.service';
import nodemailer from 'nodemailer';
import { NotificationSchema, Notification } from './model/notification';
import { FcmTokenUserModel, FcmTokenUserSchema } from './model/fcm-token-user.model';
import { NotificationController } from './controller/notification.controller';
import { NotificationService } from './service/notification.service';
import { FirebaseNotificationHelperService } from './service/notification-firebase-helper.service';

@Module({
    imports: [
        BackendJwtUtilsModule,
        MongooseModule.forRoot(
            `mongodb://${process.env.NX_MONGO_USERNAME}:${
                process.env.NX_MONGO_PASSWORD
            }@${process.env.NX_MONGO_URL || 'localhost'}/?authMechanism=DEFAULT`,
            {
                dbName: process.env.NX_MONGO_DBNAME || 'ubs_users',
            },
        ),
        MongooseModule.forFeature([
            { name: EmailTemplate.name, schema: EmailTemplateSchema },
            { name: GlobalVariable.name, schema: GlobalVariableSchema },
            { name: Notification.name, schema: NotificationSchema },
            { name: FcmTokenUserModel.name, schema: FcmTokenUserSchema },
        ]),
        MailerModule.forRoot({
            transport: `smtp://${process.env.UNOTIFY_MAIL_SERVER_UNAME}:${
                process.env.UNOTIFY_MAIL_SERVER_PW
            }@${process.env.UNOTIFY_MAIL_SERVER_HOST}${
                process.env.UNOTIFY_MAIL_SERVER_PORT
                    ? ':' + process.env.UNOTIFY_MAIL_SERVER_PORT
                    : ''
            }`,

            defaults: {
                from: process.env.UNOTIFY_MAIL_FROM,
            },
        }),
    ],
    controllers: [
        EmailTemplateController,
        GlobalVariableController,
        EmailController,
        NotificationController
    ],
    providers: [EmailTemplateService, GlobalVariableService, EmailService, NotificationService, FirebaseNotificationHelperService],
})
export class AppModule {}
