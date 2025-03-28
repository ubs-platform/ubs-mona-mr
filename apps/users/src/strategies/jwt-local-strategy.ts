import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../services/user.service';
import { UserDTO } from '@ubs-platform/users-common';
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
    }): Promise<UserDTO | null> {
        console.debug(validationPayload.userId);
        return this.userService.findUserAuthBackend(validationPayload.userId);
    }
}
