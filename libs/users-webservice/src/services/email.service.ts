import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { EmailDto } from '../dto/email.dto';
import { UserDTO, UserFullDto } from '@ubs-platform/users-common';
import { User } from '@ubs-platform/users-entity-mongo';
import { MICROSERVICE_CLIENT } from '@ubs-platform/microservice-setup-util';

@Injectable()
export class EmailService {
    constructor(
        @Inject(MICROSERVICE_CLIENT) 
        private eventClient: ClientKafka,
    ) {}

    sendEmail(
        user: UserDTO | UserFullDto | User,
        subjectGlobalVariable: string,
        messageTemplateName: string,
        otherVariables: {},
    ) {
        this.eventClient.emit('email-reset', {
            to: user.primaryEmail,
            language: user.localeCode,
            subject: `{{global:${subjectGlobalVariable}}}`,
            templateName: messageTemplateName,
            specialVariables: {
                ...otherVariables,
                userfirstname: user.name,
                userlastname: user.surname,
            },
        });
    }
}
