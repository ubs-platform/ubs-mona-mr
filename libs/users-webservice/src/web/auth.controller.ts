import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthLocalGuard } from '../guard/jwt-local.guard';
import { CurrentUser } from '../local-current-user-decorator';
import { AuthService } from '../services/auth.service';
import { Request } from 'express';
import { UserIntercept } from '../guard/user-intercept';
import { UserAuth, UserAuthBackendDTO } from '@ubs-platform/users-common';
import { matchRolesOrAdm } from '@ubs-platform/users-roles';
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post()
    async authenticate(@Body() user: UserAuth) {
        try {
            user.login = user.login?.toLowerCase();
            return await this.authService.authenticateUser(user);
        } catch (error: any) {
            console.error(error);
            throw new HttpException(error, HttpStatus.BAD_REQUEST);
        }
    }
    // Promise<UserDTO>
    @Get()
    async getSelfUser(@Req() request: Request): Promise<any> {
        return await this.authService.currentUserByJwtForFirstLogin(request);
    }

    @Post('has-role')
    @UseGuards(JwtAuthLocalGuard)
    async hasRole(
        @CurrentUser() user: UserAuthBackendDTO,
        @Body() roleList: string[],
    ): Promise<boolean> {
        return matchRolesOrAdm(roleList, user.roles);
    }

    /**
     * Single-device logout is client-side only: tokens are stateless, so
     * revoking one device would need a per-session store.
     */
    @Post('/logout')
    @UseGuards(UserIntercept)
    async logout(@CurrentUser() user: UserAuthBackendDTO) {}

    /** Revokes every session of the user, the calling one included. */
    @Post('/logout-all')
    @UseGuards(JwtAuthLocalGuard)
    async logoutAll(@CurrentUser() user: UserAuthBackendDTO) {
        await this.authService.logoutAllSessions(user.id);
    }
}
