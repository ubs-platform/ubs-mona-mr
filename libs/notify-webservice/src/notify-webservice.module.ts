import { Module } from '@nestjs/common';
import { MailerModule, MailerOptions } from '@nestjs-modules/mailer';
import { UserMicroserviceHelperModule } from '@ubs-platform/users-microservice-helper';
import { NotifyEntityMongoModule } from '@ubs-platform/notify-entity-mongo';
import { EmailTemplateController } from './controller/email-template.controller';
import { GlobalVariableController } from './controller/global-variable.controller';
import { EmailController } from './controller/email-operation.controller';
import { EmailTemplateService } from './service/email-template.service';
import { GlobalVariableService } from './service/global-variable.service';
import { EmailService } from './service/email.service';

@Module({
  imports: [
    NotifyEntityMongoModule,
    UserMicroserviceHelperModule,
    MailerModule.forRoot({
      transport: `smtp://${process.env.UNOTIFY_MAIL_SERVER_UNAME}:${
        process.env.UNOTIFY_MAIL_SERVER_PW
      }@${process.env.UNOTIFY_MAIL_SERVER_HOST}${
        process.env.UNOTIFY_MAIL_SERVER_PORT
          ? ':' + process.env.UNOTIFY_MAIL_SERVER_PORT
          : ''
      }`,
      // nodemailer 10'un kendi tipleri mailer'ın `defaults` tipinde `from`u göstermiyor; çalışma zamanında geçerli.
      defaults: {
        from: process.env.UNOTIFY_MAIL_FROM,
      } as MailerOptions['defaults'],
    }),
  ],
  controllers: [EmailTemplateController, GlobalVariableController, EmailController],
  providers: [EmailTemplateService, GlobalVariableService, EmailService],
  exports: [EmailTemplateService, GlobalVariableService, EmailService],
})
export class NotifyWebserviceModule {}
