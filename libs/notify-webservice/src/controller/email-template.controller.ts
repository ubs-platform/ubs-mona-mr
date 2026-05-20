import { Controller } from '@nestjs/common';
import { EmailTemplate } from '@ubs-platform/notify-entity-mongo';
import { EmailTemplateService } from '../service/email-template.service';
import {
    EmailTemplateDTO,
    EmailTemplateSearch,
} from '@ubs-platform/notify-common';
import { BaseCrudController, CrudControllerConfig } from '@ubs-platform/crud-base';

@Controller('email-template')
@CrudControllerConfig({ authorization: { ALL: { needsAuthenticated: true, roles: ['ADMIN'] } } })
export class EmailTemplateController extends BaseCrudController<
    EmailTemplate,
    string,
    EmailTemplateDTO,
    EmailTemplateDTO,
    EmailTemplateSearch
> {
    constructor(service: EmailTemplateService) {
        super(service);
    }
}
