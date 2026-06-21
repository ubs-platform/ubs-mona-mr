import { HttpException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, PwResetRequest, PwResetRequestQueryHelper } from '@ubs-platform/users-entity-mongo';
import { UserService } from './user.service';
import { ClientKafka, ClientProxy } from '@nestjs/microservices';
import { EmailDto } from '../dto/email.dto';
import { lastValueFrom } from 'rxjs';
import { exec } from 'child_process';
import { UserDTO } from '@ubs-platform/users-common';
import { EmailService } from './email.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class PasswordResetService {
    private pwResetQueryHelper: PwResetRequestQueryHelper;

    constructor(
        private uservice: UserService,
        @InjectModel(PwResetRequest.name)
        private passwordResetModel: Model<PwResetRequest>,
        private emailService: EmailService,
    ) {
        this.pwResetQueryHelper = new PwResetRequestQueryHelper(passwordResetModel);
        // this.eventClient.subscribeToResponseOf('email-reset.reply');
    }

    async has(id: any) {
        return (await this.pwResetQueryHelper.countValid(id)) > 0;
    }

    @Cron('* */5 * * * *')
    async handleCron() {
        await this.pwResetQueryHelper.deleteExpired();
    }

    public async insertNewRequest(username: string, origin?: string) {
        const EXPIRE_AFTER = 120;

        const u = await this.uservice.findUserByLogin({
            login: username,
            password: '',
        });
        await this.pwResetQueryHelper.deleteExpiredAndByUserId(u?.id || null);
        if (u) {
            console.info(u);

            const exp = new Date();
            exp.setMinutes(exp.getMinutes() + EXPIRE_AFTER);
            let ech = new this.passwordResetModel();
            ech.expireAfter = exp;
            ech.userId = u.id;
            ech = await ech.save();
            // return { approveId: ech.id };
            this.sendChangePwLink(u, origin!, ech._id);
        }
    }

    public async approve(pwResetId: string, newPassword: string) {
        const exist = await this.pwResetQueryHelper.findValidById(pwResetId);
        console.info('Current email change refresh', exist);
        if (exist) {
            console.info(exist.userId);
            await this.uservice.changePasswordForgor(exist.userId, newPassword);
            await this.pwResetQueryHelper.deleteById(exist.id);
            // await this.sendPasswordChangedMail(exist.userId);
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
