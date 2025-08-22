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
} from '@nestjs/common';
import {
    ClientKafka,
    EventPattern,
    MessagePattern,
} from '@nestjs/microservices';
import { UserService } from '../services/user.service';
import { JwtAuthLocalGuard } from '../guard/jwt-local.guard';
import { CurrentUser } from '../local-current-user-decorator';
import { EmailChangeRequestService } from '../services/email-change-request.service';
import {
    UserAuthBackendDTO,
    UserRegisterDTO,
} from '@ubs-platform/users-common';
import { CacheManagerService } from '@ubs-platform/cache-manager';

@Controller()
export class UserMicroserviceController {
    CACHE_PREFIX_MSCTRL = 'usermsctrl';
    constructor(
        private userService: UserService,
        @Inject('KAFKA_CLIENT') private kafkaClient: ClientKafka,
        private cacheman: CacheManagerService,
    ) {
        // this.kafkaClient.emit('register-category', {
        //     category: 'PROFILE_PHOTO',
        //     serviceTcpHost: process.env['U_USERS_MONA_INTERNAL_COM_HOST'],
        //     serviceTcpPort: process.env['U_USERS_MONA_INTERNAL_COM_PORT'],
        // });
    }

    @MessagePattern('file-upload-PROFILE_PHOTO')
    async changeProfilePhoto(data: { userId: any }) {
        console.info('test');
        const category = 'PROFILE_PHOTO',
            name = data.userId;
        return { category, name, volatile: false, maxLimitBytes: 3000000 };
    }

    @MessagePattern('user-by-id')
    async findUserAuthFromId(id: any): Promise<UserAuthBackendDTO | null> {
        return await this.cacheman.getOrCallAsync(
            `${this.CACHE_PREFIX_MSCTRL} findUserAuthFromId ${id}`,
            () => this.userService.findUserAuthBackend(id),
            { livetime: 1000, livetimeExtending: 'ON_GET' },
        );
    }

    @MessagePattern('user-role-check')
    async hasUserRoleOrJew({
        userId,
        role,
    }: {
        userId: string;
        role: string;
    }): Promise<boolean> {
        return await this.cacheman.getOrCallAsync(
            `${this.CACHE_PREFIX_MSCTRL} hasUserRoleOrJew ${userId} ${role}`,
            () => this.userService.hasUserRoleAtLeastOneOrAdmin(userId, role),
            { livetime: 1000, livetimeExtending: 'ON_GET' },
        );
    }

    @EventPattern('user-role-insert')
    async insertRole({
        userId,
        role,
    }: {
        userId: string;
        role: string;
    }): Promise<void> {
        await this.userService.insertRole(userId, role);
    }

    @EventPattern('user-role-remove')
    async removeRole(userId: string, role: string): Promise<void> {
        await this.userService.removeRole(userId, role);
    }
}
