import { Inject, Injectable, Scope } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../service/user.service';
import {
    UserAuthBackendDTO,
    UserDTO,
    tokenVersionMatches,
} from '@ubs-platform/users-common';
import { JwtConstants } from '@ubs-platform/users-consts';

@Injectable({})
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private userService: UserService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: JwtConstants.SECRET_JWT,
        });
    }

    async validate(validationPayload: {
        userId: any;
        tv?: number;
    }): Promise<UserDTO | null> {
        // `user-by-id` actually answers with the backend DTO, which carries
        // the session generation.
        const user = (await this.userService.findUserAuth(
            validationPayload.userId,
        )) as UserDTO & Pick<UserAuthBackendDTO, 'tokenVersion'>;
        // Returning null makes passport answer 401.
        return tokenVersionMatches(validationPayload, user) ? user : null;
    }
}
