import {
    Body,
    Controller,
    Delete,
    Get,
    HttpException,
    HttpStatus,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ErrorInformations,
    OAuthCompleteRegistrationDTO,
    OAuthCredentialDTO,
    OAuthLinkWithPasswordDTO,
    UBSUsersErrorConsts,
    UserAuthBackendDTO,
} from '@ubs-platform/users-common';
import { JwtAuthLocalGuard } from '../guard/jwt-local.guard';
import { CurrentUser } from '../local-current-user-decorator';
import { OAuthService } from '../services/oauth.service';

@Controller('auth/oauth')
export class OAuthController {
    constructor(private oauthService: OAuthService) {}

    @Get('providers')
    providers() {
        return this.oauthService.listProviders();
    }

    @Post('login/:provider')
    login(@Param('provider') provider: string, @Body() body: OAuthCredentialDTO) {
        return handle(() => this.oauthService.login(provider, body?.credential));
    }

    @Get('session/:key')
    session(@Param('key') key: string) {
        return handle(() => this.oauthService.getSession(key));
    }

    @Post('session/:key/register')
    register(
        @Param('key') key: string,
        @Body() body: OAuthCompleteRegistrationDTO,
    ) {
        return handle(() => this.oauthService.completeRegistration(key, body));
    }

    @Post('session/:key/link')
    linkWithPassword(
        @Param('key') key: string,
        @Body() body: OAuthLinkWithPasswordDTO,
    ) {
        return handle(() =>
            this.oauthService.linkWithPassword(key, body?.password),
        );
    }

    @Get('links')
    @UseGuards(JwtAuthLocalGuard)
    links(@CurrentUser() user: UserAuthBackendDTO) {
        return this.oauthService.listLinks(user.id);
    }

    @Post('links/:provider')
    @UseGuards(JwtAuthLocalGuard)
    addLink(
        @CurrentUser() user: UserAuthBackendDTO,
        @Param('provider') provider: string,
        @Body() body: OAuthCredentialDTO,
    ) {
        return handle(() =>
            this.oauthService.linkToUser(user.id, provider, body?.credential),
        );
    }

    @Delete('links/:id')
    @UseGuards(JwtAuthLocalGuard)
    removeLink(
        @CurrentUser() user: UserAuthBackendDTO,
        @Param('id') id: string,
    ) {
        return handle(() => this.oauthService.unlink(user.id, id));
    }
}

const UNAUTHORIZED_KEYS = new Set([
    UBSUsersErrorConsts.OAUTH_INVALID_CREDENTIAL,
    UBSUsersErrorConsts.AUTHENTICATION_FAIL,
]);

/** Maps domain errors to HTTP errors while keeping the `{ key, message }` body. */
async function handle<T>(action: () => Promise<T>): Promise<T> {
    try {
        return await action();
    } catch (error) {
        if (error instanceof ErrorInformations) {
            const status = UNAUTHORIZED_KEYS.has(error.key)
                ? HttpStatus.UNAUTHORIZED
                : error.key === UBSUsersErrorConsts.OAUTH_TOO_MANY_ATTEMPTS
                  ? HttpStatus.TOO_MANY_REQUESTS
                  : HttpStatus.BAD_REQUEST;
            throw new HttpException(error, status);
        }
        throw error;
    }
}
