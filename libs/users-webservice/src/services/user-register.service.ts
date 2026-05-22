import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectBaseRepository, IBaseRepository, QueryOperators } from '@ubs-platform/entity-base';
import { User } from '@ubs-platform/users-entity-mongo';
import { EmailService } from './email.service';
import { UserCandiate } from '@ubs-platform/users-entity-mongo';
import {
    ErrorInformations,
    UBSUsersErrorConsts,
    UserRegisterDTO,
} from '@ubs-platform/users-common';
import { UserMapper } from '../mapper/user.mapper';
import { randomUUID } from 'crypto';
import { UserCommonService } from './user-common.service';
import { UserService } from './user.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class UserRegisterService {
    constructor(
        @InjectBaseRepository(UserCandiate)
        private userCandiateRepository: IBaseRepository<UserCandiate>,
        private userService: UserService,
        private emailService: EmailService,
        private userCommon: UserCommonService,
    ) {}

    @Cron('* */5 * * * *')
    async handleCron() {
        await this.userCandiateRepository.deleteMany({
            expireDate: QueryOperators.LessThan(new Date()),
        });
    }

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
            const u = await this.userCandiateRepository.findOne({ activationKey });
            if (u) {
                await this.userService.saveNewUser(
                    {
                        active: true,
                        localeCode: u.localeCode,
                        name: u.name,
                        surname: u.surname,
                        username: u.username,
                        password: u.passwordEncyripted,
                        primaryEmail: u.primaryEmail,
                        roles: [],
                    },
                    false,
                );
                await this.userCandiateRepository.delete(u.id!);
            } else {
                throw new NotFoundException();
            }
        }
    }

    async renewOrCheckOld(id?: string) {
        let a = id ? await this.userCandiateRepository.findById(id) : null;
        if (!a) {
            const newCand: Partial<UserCandiate> = {};
            this.setExpireDate(newCand as any, 0, 2);
            a = await this.userCandiateRepository.create(newCand);
        } else {
            this.setExpireDate(a, 0, 2);
            a = await this.userCandiateRepository.save(a);
        }
        return await UserMapper.toCandiateDto(a);
    }

    async register(uregister: UserRegisterDTO, origin: string) {
        await this.assertUserInfoValid(uregister);

        let a = await this.userCandiateRepository.findById(uregister.registerId);
        if (a) {
            await UserMapper.transferToCandiateEntity(a, uregister);

            a.activationKey = randomUUID();
            this.setExpireDate(a, 0, 7);
            a = await this.userCandiateRepository.save(a);
            await this.sendRegisteredEmail(a, a.activationKey!, origin);

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
        if (uregister.registerId == null) {
            throw new BadRequestException(
                'user-candiate',
                'registration id is required',
            );
        }
        if (!uregister.password) {
            throw new ErrorInformations(
                'user-candiate',
                'password-is-missing.',
            );
        }

        await this.userCommon.assertUserInfoValid(uregister);

        const us = await this.userCandiateRepository.find([
            {
                username: uregister.username,
                id: QueryOperators.NotEqual(uregister.registerId),
            },
            {
                primaryEmail: uregister.primaryEmail,
                id: QueryOperators.NotEqual(uregister.registerId),
            },
        ]);
        if (us.length) {
            if (us[0].username == uregister.username) {
                throw new ErrorInformations(
                    UBSUsersErrorConsts.EXIST_USERNAME,
                    'User with that login is exist.',
                );
            } else {
                throw new ErrorInformations(
                    UBSUsersErrorConsts.EXIST_PRIMARY_MAIL,
                    'User with that primary mail is exist.',
                );
            }
        }
    }
}
