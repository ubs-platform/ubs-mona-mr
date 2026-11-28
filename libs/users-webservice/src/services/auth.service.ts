import {
    ErrorInformations,
    TOKEN_VERSION_CLAIM,
    tokenVersionMatches,
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
        const tokenVersion = await this.userService.findTokenVersion(a);
        if (
            ab.active &&
            tokenVersionMatches(jwtDecoded, { tokenVersion })
        ) {
            return ab;
        } else {
            throw new UnauthorizedException();
        }
    }

    async authenticateUser(userLogin: UserAuth) {
        let realUser = await this.userService.findUserWithPassword(userLogin);
        // const correspond = realUser.passwordEncyripted == passwdHashed;
        if (realUser) {
            return await this.issueToken(realUser.id);
        } else {
            throw new ErrorInformations(
                UBSUsersErrorConsts.AUTHENTICATION_FAIL,
                'User is not found or password does not match',
            );
        }
    }

    /**
     * Issues this service's session token; every login method ends here.
     * The token is bound to the user's current session generation.
     */
    async issueToken(userId: any): Promise<UserAuthSuccess> {
        const tokenVersion = await this.userService.findTokenVersion(userId);
        return new UserAuthSuccess(
            this.jwtService.sign({
                userId,
                [TOKEN_VERSION_CLAIM]: tokenVersion,
            }),
        );
    }

    /** Revokes every session of the user, including the calling one. */
    async logoutAllSessions(userId: any): Promise<void> {
        await this.userService.revokeSessions(userId);
    }

    async verifyToken(token: string) {
        const verifed = await this.jwtService.verifyAsync(token);
        return verifed != null;
    }
}
