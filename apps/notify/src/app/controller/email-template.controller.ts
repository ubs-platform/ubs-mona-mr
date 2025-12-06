import { Controller } from '@nestjs/common';
import { EmailTemplate } from '../model/email-template.model';
import { EmailTemplateService } from '../service/email-template.service';
import {
    EmailTemplateDTO,
    EmailTemplateSearch,
} from '@ubs-platform/notify-common';
import { BaseCrudControllerGenerator } from '@ubs-platform/crud-base';

const config = {
    authorization: { ALL: { needsAuthenticated: true, roles: ['ADMIN'] } },
};
@Controller('email-template')
export class EmailTemplateController extends BaseCrudControllerGenerator<
    EmailTemplate,
    string,
    EmailTemplateDTO,
    EmailTemplateDTO,
    EmailTemplateSearch
>(config) {
    constructor(service: EmailTemplateService) {
        super(service);
    }
}
