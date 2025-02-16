import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { publicDecrypt } from 'crypto';
import { GlobalVariableService } from './global-variable.service';
import { EmailTemplateService } from './email-template.service';

import * as Handlebars from 'handlebars';
import { EmailDto } from '@ubs-platform/notify-common';
@Injectable()
export class EmailService {
    constructor(
        private mailerService: MailerService,
        private globalVariableService: GlobalVariableService,
        private templateService: EmailTemplateService,
    ) {}

    public async sendWithTemplate(em: EmailDto) {
        const templates = await this.templateService.fetchAll({
            nameContains: em.templateName,
        });
        console.info(templates);
        if (templates.length > 0) {
            const temp = templates[0];
            const messageExpandedGlobals =
                await this.globalVariableService.globalVariableApply({
                    text: temp.htmlContent,
                    language: em.language,
                });

            const subjectExpandedGlobals =
                await this.globalVariableService.globalVariableApply({
                    text: em.subject,
                    language: em.language,
                });
            const applyTemplate = Handlebars.compile(messageExpandedGlobals);
            const txt = applyTemplate(em.specialVariables);
            await this.mailerService.sendMail({
                html: txt,
                subject: subjectExpandedGlobals,
                to: em.to,
            });
        } else {
            console.warn('Any template not found');
        }
    }
}
