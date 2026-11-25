import {
    ErrorInformations,
    UBSUsersErrorConsts,
    UserAuth,
    UserAuthSuccess,
} from '@ubs-platform/users-common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from './user.service';
import { Request } from 'express';
@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService,
    ) {}

    async currentUserByJwtForFirstLogin(request: Request) {
        const jwt = request.headers.authorization
            ?.replace('Bearer ', '')
            ?.replace('bearer ', '');

        const jwtDecoded = await this.jwtService.verifyAsync(jwt!);

        const a = jwtDecoded['userId'];
        const ab = await this.userService.findUserAuth(a);
        if (ab.active) {
            return ab;
        } else {
            throw new UnauthorizedException();
        }
    }

    async authenticateUser(userLogin: UserAuth) {
        let realUser = await this.userService.findUserWithPassword(userLogin);
        // const correspond = realUser.passwordEncyripted == passwdHashed;
        if (realUser) {
            return this.issueToken(realUser.id);
        } else {
            throw new ErrorInformations(
                UBSUsersErrorConsts.AUTHENTICATION_FAIL,
                'User is not found or password does not match',
            );
        }
    }

    /** Issues this service's session token; every login method ends here. */
    issueToken(userId: any): UserAuthSuccess {
        return new UserAuthSuccess(this.jwtService.sign({ userId }));
    }

    async verifyToken(token: string) {
        const verifed = await this.jwtService.verifyAsync(token);
        return verifed != null;
    }
}
