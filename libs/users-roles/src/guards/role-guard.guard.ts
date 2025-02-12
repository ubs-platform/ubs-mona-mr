import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../decorator/roles.decorator';
import { matchRolesOrAdm } from '../match-role';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';
import { JwtConstants } from '@ubs-platform/users-consts';

@Injectable()
export class RolesGuard implements CanActivate {
    sex: string;
    constructor(private reflector: Reflector) {}
    canActivate(context: ExecutionContext): boolean {
        this.testo(JwtConstants.SECRET_PW);
        const roles = this.reflector.get(Roles, context.getHandler());
        if (!roles) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user as UserAuthBackendDTO;
        return matchRolesOrAdm(roles, user.roles);
    }

    testo(str: string | undefined) {
        this.sex = str!;
    }
}
