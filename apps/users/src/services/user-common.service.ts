import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
    UserDTO,
    UserCreateDTO,
    UserRegisterDTO,
    ErrorInformations,
    UBSUsersErrorConsts,
} from '@ubs-platform/users-common';
import { User } from '../domain/user.model';
import { EmailService } from './email.service';
import { Model } from 'mongoose';
import { UserMapper } from '../mapper/user.mapper';
@Injectable()
export class UserCommonService {
    constructor(@InjectModel(User.name) private userModel: Model<User>) {}

    async findByUsernameOrEmail(
        username: string,
        email: string,
    ): Promise<UserDTO[]> {
        const us = await this.userModel.find({
            $or: [{ username: username }, { primaryEmail: email }],
        });
        return UserMapper.toDtoList(us);
    }

    // async findByEmail(primaryEmail: string): Promise<UserDTO[]> {
    //     return await this.userModel.find({
    //         primaryEmail: primaryEmail,
    //     });
    // }

    async assertUserInfoValid(user: UserDTO | UserCreateDTO | UserRegisterDTO) {
        if (!user || !user.username || !user.primaryEmail) {
            throw new ErrorInformations(
                UBSUsersErrorConsts.EMPTY_DATA,
                'One or More Required informations are empty.',
            );
        }

        const userWithPrimaryMail = await this.findByUsernameOrEmail(
            user.username,
            user.primaryEmail,
        );
        if (userWithPrimaryMail.length) {
            if (userWithPrimaryMail[0].username == user.username) {
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
