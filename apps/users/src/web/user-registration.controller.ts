import { UserService } from '../services/user.service';
import { UserRegisterDTO } from '@ubs-platform/users-common';
import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Inject,
    Param,
    Post,
    Put,
    UploadedFile,
    UseGuards,
    Headers,
    UseInterceptors,
    Query,
} from '@nestjs/common';
import { UserRegisterService } from '../services/user-register.service';
@Controller('user-registration')
export class UserRegisterController {
    constructor(private userRegisterService: UserRegisterService) {}

    @Post('init')
    async startRegistration(@Query('registration-id') registrationId?: string) {
        return await this.userRegisterService.renewOrCheckOld(registrationId);
    }

    @Post()
    async registerUser(@Body() user: UserRegisterDTO, @Headers() headers: any) {
        if (user.username.includes(' ') || user.username.includes('\n')) {
            throw new HttpException(
                'error.username.space',
                HttpStatus.BAD_REQUEST,
            );
        }
        try {
            await this.userRegisterService.register(user, headers?.['origin']);
        } catch (error) {
            throw new HttpException(error, HttpStatus.BAD_REQUEST);
        }
    }

    @Post('activate/:key')
    public async activate(@Param() { key }: { key: string }) {
        await this.userRegisterService.enableUser(key);
    }
}
