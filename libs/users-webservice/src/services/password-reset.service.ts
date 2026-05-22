import { HttpException, Inject, Injectable } from '@nestjs/common';
import { InjectBaseRepository, IBaseRepository, QueryOperators } from '@ubs-platform/entity-base';
import { User } from '@ubs-platform/users-entity-mongo';
import { PwResetRequest } from '@ubs-platform/users-entity-mongo';
import { UserService } from './user.service';
import { UserDTO } from '@ubs-platform/users-common';
import { EmailService } from './email.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class PasswordResetService {
    constructor(
        private uservice: UserService,
        @InjectBaseRepository(PwResetRequest)
        private passwordResetRepository: IBaseRepository<PwResetRequest>,
        private emailService: EmailService,
    ) {}

    async has(id: any) {
        return (
            (await this.passwordResetRepository.count({
                id: id,
                expireAfter: QueryOperators.GreaterThan(new Date()),
            })) > 0
        );
    }

    @Cron('* */5 * * * *')
    async handleCron() {
        await this.passwordResetRepository.deleteMany({
            expireAfter: QueryOperators.LessThan(new Date()),
        });
    }

    public async insertNewRequest(username: string, origin?: string) {
        const EXPIRE_AFTER = 120;

        const u = await this.uservice.findUserByLogin({
            login: username,
            password: '',
        });

        const deleteConditions: any[] = [
            { expireAfter: QueryOperators.LessThan(new Date()) }
        ];
        if (u?.id) {
            deleteConditions.push({ userId: u.id });
        }
        await this.passwordResetRepository.deleteMany(deleteConditions);

        if (u) {
            console.info(u);

            const exp = new Date();
            exp.setMinutes(exp.getMinutes() + EXPIRE_AFTER);
            const ech = await this.passwordResetRepository.create({
                expireAfter: exp,
                userId: u.id,
            });
            this.sendChangePwLink(u, origin!, ech.id!);
        }
    }

    public async approve(pwResetId: string, newPassword: string) {
        const exist = await this.passwordResetRepository.findOne({
            id: pwResetId,
            expireAfter: QueryOperators.GreaterThan(new Date()),
        });
        console.info('Current email change refresh', exist);
        if (exist) {
            console.info(exist.userId);
            await this.uservice.changePasswordForgor(exist.userId, newPassword);
            await this.passwordResetRepository.delete(exist.id!);
        } else {
            throw new HttpException('No records found', 404);
        }
    }

    private sendChangePwLink(u: UserDTO, origin: string, echId: string) {
        this.emailService.sendEmail(u, 'password-reset-short', 'ubs-pwreset', {
            link:
                origin +
                process.env['U_USERS_PW_RESET_URL']?.replace(':id', echId),
        });
    }
}
