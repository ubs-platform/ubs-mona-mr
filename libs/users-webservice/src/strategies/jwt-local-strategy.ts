import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../services/user.service';
import { UserDTO, tokenVersionMatches } from '@ubs-platform/users-common';
import { JwtConstants } from '@ubs-platform/users-consts';

@Injectable()
export class JwtLocalStrategy extends PassportStrategy(Strategy) {
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
        const user = await this.userService.findUserAuthBackend(
            validationPayload.userId,
        );
        // Returning null makes passport answer 401.
        return tokenVersionMatches(validationPayload, user) ? user : null;
    }
}
