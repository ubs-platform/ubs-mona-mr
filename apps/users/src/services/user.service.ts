import {
    BadRequestException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { User } from '../domain/user.model';
// const Cyripto = require("crypto-promise")
import { UserMapper } from '../mapper/user.mapper';
import { CryptoOp } from '../util/crypto-op';
import {
    UserGeneralInfoDTO,
    PasswordChangeDto,
    UserCreateDTO,
    UserRegisterDTO,
    UserDTO,
    UserAuth,
    UserFullDto,
    UserAuthBackendDTO,
    ErrorInformations,
    UBSUsersErrorConsts,
} from '@ubs-platform/users-common';
import { ClientKafka } from '@nestjs/microservices';
import { EmailDto } from '../dto/email.dto';
import { randomUUID } from 'crypto';
import { EmailService } from './email.service';
import { UserCommonService } from './user-common.service';
import { UserKafkaEvents } from '@ubs-platform/users-consts';
import { SearchUtil } from '@ubs-platform/crud-base';
import { UserAdminSearch } from 'libs/users-common/src/user-admin-search.dto';
import { exec } from 'child_process';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        @Inject('KAFKA_CLIENT') private client: ClientKafka,
        private emailService: EmailService,
        private userCommonService: UserCommonService,
    ) {
        this.initOperation();
    }

    async fetchAllUsers() {
        return (await this.userModel.find()).map((a) =>
            UserMapper.toAuthBackendDto(a),
        );
    }

    async fetchAllUsersPaginated(uas: UserAdminSearch) {
        return (
            await SearchUtil.modelSearch(this.userModel, uas.size, uas.page, {})
        ).mapAsync(async (a) => UserMapper.toAuthBackendDto(a));
    }

    async fetchUserGeneralInformation(user: UserGeneralInfoDTO) {
        const userExist = await this.userModel.findById(user.id);
        console.info(userExist);
        if (userExist) {
            return UserMapper.toGeneralDto(userExist);
        } else {
            throw 'not.found';
        }
    }

    async changePasswordLogged(id: string, pwChange: PasswordChangeDto) {
        const u = await this.userModel.findById(id);

        if (u) {
            if (
                !(await CryptoOp.checkPassword(
                    pwChange.currentPassword,
                    u.passwordEncyripted,
                ))
            ) {
                throw 'password-does-not-match';
            } else {
                u.passwordEncyripted = await CryptoOp.encryptPassword(
                    pwChange.newPassword,
                );
                await u.save();
                await this.sendPasswordChangedMail(u);
                return UserMapper.toAuthDto(u);
            }
        } else {
            throw 'not-found';
        }
    }

    async changePasswordForgor(id: string, newPassword: string) {
        const u = await this.userModel.findById(id);

        if (u) {
            u.passwordEncyripted = await CryptoOp.encryptPassword(newPassword);
            await u.save();
            await this.sendPasswordChangedMail(u);
            return UserMapper.toAuthDto(u);
        } else {
            throw 'not-found';
        }
    }

    async sendPasswordChangedMail(u: User) {
        this.sendEmail(u, 'ubs-pwreset-changed-short', 'ubs-pwreset-changed');
    }

    async sendEmail(
        u: User,
        subject: string,
        templateName: string,
        specialVariables: { [key: string]: any } = {},
    ) {
        this.emailService.sendEmail(u, subject, templateName, specialVariables);
    }

    async saveNewUser(
        user: UserCreateDTO & { id?: string },
        encryptPassword = true,
    ) {
        await this.userCommonService.assertUserInfoValid(user);
        const u = new this.userModel();
        await UserMapper.createFrom(u, user, encryptPassword);
        await u.save();

        return UserMapper.toAuthDto(u);
    }

    async changeEmail(userId: any, newEmail: string) {
        const user = await this.userModel.findById(userId);
        if (user) {
            user.primaryEmail = newEmail;
            await user.save();
            return UserMapper.toAuthDto(user);
        }
    }

    async findUserByLogin(userLogin: UserAuth): Promise<UserDTO | null> {
        let realUser: UserDTO | null = null;
        // const userUname = await this.userCommonService.findByUsername(
        //     userLogin.login,
        // );
        // if (userUname.length) {
        //     realUser = userUname[0];
        // } else {

        // }
        const userEmail = await this.userCommonService.findByUsernameOrEmail(
            userLogin.login,
            userLogin.login,
        );
        if (userEmail.length) {
            realUser = userEmail[0];
        }
        return realUser;
    }

    async findByEmailExcludeUserId(
        primaryEmail: string,
        userIdExclude: any,
    ): Promise<UserDTO[]> {
        return await this.userModel.find({
            primaryEmail: primaryEmail,
            _id: {
                $ne: userIdExclude,
            },
        });
    }

    private async findByEmailPwHash(
        primaryEmail: string,
        pwHash: string,
    ): Promise<UserDTO[]> {
        return await this.userModel.find({
            primaryEmail: primaryEmail,
            passwordEncyripted: pwHash,
        });
    }

    public async findUserWithPassword(username: UserAuth): Promise<UserDTO> {
        const us = await this.userModel.findOne({
            $and: [
                {
                    $or: [
                        { username: username.login },
                        { primaryEmail: username.login },
                    ],
                },
            ],
        });

        if (us) {
            if (
                await CryptoOp.checkPassword(
                    username.password,
                    us.passwordEncyripted,
                )
            ) {
                return UserMapper.toAuthDto(us);
            } else {
                throw new NotFoundException();
            }
        } else {
            throw new NotFoundException();
        }
    }

    async removeRole(userId: string, role: string): Promise<void> {
        const u = await this.userModel.findById(userId);
        if (u) {
            const roleIndex = u.roles.indexOf(role);
            if (roleIndex > -1) {
                u.roles.splice(roleIndex, 1);
                await u.save();
            }
        }
    }

    async insertRole(userId: string, role: string): Promise<void> {
        const u = await this.userModel.findById(userId);
        if (u) {
            if (!u.roles.includes(role)) {
                u.roles.push(role);
                await u.save();
            }
        }
    }

    async hasUserRoleAtLeastOneOrAdmin(
        userId: string,
        role: string,
    ): Promise<boolean> {
        return (
            (await this.userModel.countDocuments({
                id: userId,
                roles: ['ADMIN', role],
            })) > 0
        );
    }

    async findFullInfo(id: any): Promise<UserFullDto> {
        return UserMapper.toFullDto((await this.userModel.findById(id))!);
    }

    async findUserAuth(id: any): Promise<UserDTO> {
        return UserMapper.toAuthDto(await this.findByIdRaw(id));
    }

    private async findByIdRaw(id: any) {
        return (await this.userModel.findById(id))!;
    }

    async findUserAuthBackend(id: any): Promise<UserAuthBackendDTO | null> {
        const u = await this.userModel.findById(id);
        if (u && u.active && !u.suspended) {
            return UserMapper.toAuthBackendDto(u);
        } else {
            return null;
        }
    }

    async addUserFullInformation(data: UserFullDto) {
        if (
            (
                await this.userCommonService.findByUsernameOrEmail(
                    data.username,
                    data.primaryEmail,
                )
            ).length
        ) {
            throw 'email-is-using-already';
        }
        // if (user.roles.includes('ADMIN')) {
        //   data.roles = ['ADMIN'];
        //   data.active = true;
        //   data.suspended = false;
        // }
        const user = new this.userModel();
        await UserMapper.userFullFromUser(user, data);
        await user.save();
        UserMapper.toAuthDto(user);
    }

    async findById(id: ObjectId | string) {
        return UserMapper.toFullDto(await this.findByIdRaw(id));
    }

    async editUserFullInformation(data: UserFullDto) {
        if (
            (await this.findByEmailExcludeUserId(data.primaryEmail, data._id))
                .length
        ) {
            throw 'email-is-using-already';
        }
        const user = await this.userModel.findById(data._id);
        console.info(user);
        if (user) {
            await UserMapper.userFullFromUser(user, data);
            await user.save();
            UserMapper.toAuthDto(user);
        } else {
            throw 'not.found';
        }
    }

    async editUserGeneralInformation(data: UserGeneralInfoDTO, id: any) {
        const user = await this.userModel.findById(id);
        console.info(user);
        if (user) {
            UserMapper.userFromGeneralInfo(user, data);

            await this.saveUserWithEditEvent(user);
        } else {
            throw 'not.found';
        }
    }

    private async saveUserWithEditEvent(
        user: import('mongoose').Document<unknown, {}, User> &
            User & { _id: import('mongoose').Types.ObjectId } & { __v: number },
    ) {
        await user.save();
        const uDto = UserMapper.toAuthDto(user);
        this.client.emit(UserKafkaEvents.USER_EDITED, uDto);
        return uDto;
    }

    async deleteUser(id: any) {
        const user = await this.userModel.findById(id);
        if (user) {
            // UserMapper.userFromGeneralInfo(user, data);
            await user.deleteOne();
            return UserMapper.toGeneralDto(user);
            // UserMapper.toAuthDto(user);
        } else {
            return null;
        }
    }

    async initOperation() {
        const count = await this.userModel.countDocuments();
        if (count == 0) {
            const user = {
                username: process.env['UBS_USERS_INITIAL_USERNAME'] || 'kyle',
                password: process.env['UBS_USERS_INITIAL_PW'] || 'kyle',
                primaryEmail:
                    process.env['UBS_USERS_INITIAL_EMAIL'] || 'main@localhost',
                name: process.env['UBS_USERS_INITIAL_NAME'] || 'Kyle',
                surname:
                    process.env['UBS_USERS_INITIAL_SURNAME'] || 'Broflovski',
                active: true,
                roles: ['ADMIN'],
            } as UserCreateDTO;
            await this.saveNewUser(user);
            if (user.name == 'Kyle' && user.surname == 'Broflovski') {
                console.warn(
                    'We suppose that you are Kip Drordy, you are so alone and have social anxiety. So admin user "Kyle Broflovski" has been added for emotional support. Please see the following output\n',
                );
            } else {
                console.warn(
                    'Initial user has been added. Please see the following output',
                );
            }
            console.warn(
                "Don't forget to change these informations before production.",
            );
            console.info(user);
            // }
        }
    }
}
