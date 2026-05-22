import { Injectable } from '@nestjs/common';
import { EmailChangeRequest } from '@ubs-platform/users-entity-mongo';
import { InjectBaseRepository, IBaseRepository, QueryOperators } from '@ubs-platform/entity-base';
import { User } from '@ubs-platform/users-entity-mongo';
import { UserService } from './user.service';
import { CryptoOp } from '../util/crypto-op';
import { EmailService } from './email.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class EmailChangeRequestService {
    constructor(
        @InjectBaseRepository(EmailChangeRequest)
        private echReqRepository: IBaseRepository<EmailChangeRequest>,
        private userService: UserService,
        private emailService: EmailService,
    ) {}

    @Cron('* */5 * * * *')
    async handleCron() {
        await this.echReqRepository.deleteMany({
            expireAfter: QueryOperators.LessThan(new Date()),
        });
    }

    public async insertNewRequest(
        userId: string,
        newEmail: string,
    ): Promise<{ approveId: string }> {
        await this.echReqRepository.deleteMany({
            expireAfter: QueryOperators.LessThan(new Date()),
        });
        if (
            (await this.userService.findByEmailExcludeUserId(newEmail, userId))
                .length
        ) {
            throw 'email-is-using-already';
        }
        const exp = new Date();
        exp.setMinutes(exp.getMinutes() + 2);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const encryptedCode = await CryptoOp.encryptPassword(code); // TODO: Randomize and send email

        const ech = await this.echReqRepository.create({
            newEmail,
            userId,
            code: encryptedCode,
            expireAfter: exp,
        });
        await this.sendMail(userId, newEmail, code);

        return { approveId: ech.id! };
    }

    private async sendMail(userId: string, newEmail: string, code: string) {
        const u = await this.userService.findById(userId);

        await this.emailService.sendEmail(
            u,
            'ubs-user-email-change-title',
            'ubs-user-email-change',
            { code },
        );
    }

    public async approveEmailChange(
        userId: string,
        approvementId: string,
        code: string,
    ) {
        const exist = await this.echReqRepository.findOne({
            id: approvementId,
            userId: userId,
        });
        console.info('Current email change refresh', exist);
        if (exist) {
            if (new Date() > exist.expireAfter) {
                throw 'request-expired';
            } else if (!(await CryptoOp.checkPassword(code, exist.code))) {
                throw 'code-does-not-match';
            }
            let user = (await this.userService.findUserAuth(exist.userId))!;
            user.primaryEmail = exist.userId;
            user = (await this.userService.changeEmail(
                exist.userId,
                exist.newEmail,
            ))!;
        } else {
            throw 'not-found';
        }
    }
}
