import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../domain/user.model';
import { EmailService } from './email.service';
import { UserCandiate, UserCandiateDoc } from '../domain/user-candiate.model';
import { Model, ObjectId } from 'mongoose';
import { retry } from 'rxjs';
import {
    ErrorInformations,
    UBSUsersErrorConsts,
    UserRegisterDTO,
} from '@ubs-platform/users-common';
import { UserMapper } from '../mapper/user.mapper';
import { Mode } from 'fs';
import { randomUUID } from 'crypto';
import { UserCommonService } from './user-common.service';

@Injectable()
export class UserRegisterService {
    constructor(
        @InjectModel(UserCandiate.name)
        private userCandiateModel: Model<UserCandiate>,
        private userModel: Model<User>,
        // @Inject('KAFKA_CLIENT') private client: ClientKafka,
        private emailService: EmailService,
        private userCommon: UserCommonService,
    ) {}

    async sendRegisteredEmail(u: UserCandiate, key: string, origin = '') {
        const link =
            origin +
            process.env['U_USERS_REGISTERED_USER_VALIDATING_URL']?.replace(
                ':key',
                key,
            );
        this.emailService.sendEmail(
            u,
            'ubs-user-registered-short',
            'ubs-user-registered',
            {
                link,
            },
        );
    }

    async enableUser(activationKey: string) {
        if (activationKey) {
            const u = await this.userCandiateModel.findOne({ activationKey });
            if (u) {
                //todo: userCandiate to user
                // u.active = true;
                // u.activationKey = '';
                // u.save();
            }
        }
    }

    async renewOrCheckOld(id?: string) {
        let a = id ? await this.userCandiateModel.findById(id) : null;
        if (!a) {
            a = new this.userCandiateModel();
        }

        this.setExpireDate(a, 0, 2);

        a = await a.save();
        return await UserMapper.toCandiateDto(a);
    }

    async registerUser(user: UserRegisterDTO, origin?: string) {
        const u = new this.userModel();
        await UserMapper.registerFrom(u, user);
    }

    async register(uregister: UserRegisterDTO) {
        await this.assertUserInfoValid(uregister);
        if (!uregister.password) {
            throw new ErrorInformations(
                UBSUsersErrorConsts.EMPTY_DATA,
                'password-is-missing.',
            );
        }

        let a = await this.userCandiateModel.findById(uregister.registerId);
        if (a) {
            await UserMapper.transferToCandiateEntity(a, uregister);

            a.activationKey = randomUUID();
            this.setExpireDate(a, 0, 7);
            await a.save();
            await this.sendRegisteredEmail(a, a.activationKey, origin);

            return UserMapper.toCandiateDto(a);
        } else {
            throw new NotFoundException('user-candiate', uregister.registerId);
        }
    }

    private setExpireDate(
        a: UserCandiate,
        plusDays: number,
        plusHours: number,
    ) {
        const date = new Date();
        date.setHours(date.getHours() + plusHours);
        date.setDate(date.getDate() + plusDays);
        a.expireDate = date;
    }

    async assertUserInfoValid(uregister: UserRegisterDTO) {
        await this.userCommon.assertUserInfoValid(uregister);

        const us = await this.userModel.find({
            $or: [
                { username: uregister.username },
                { primaryEmail: uregister.primaryEmail },
            ],
            _id: { $ne: uregister.registerId },
        });
        if (us.length) {
            throw new ErrorInformations(
                UBSUsersErrorConsts.EXIST_PRIMARY_MAIL_OR_USERNAME,
                'User with that primary mail or login is exist.',
            );
        }
    }
}
