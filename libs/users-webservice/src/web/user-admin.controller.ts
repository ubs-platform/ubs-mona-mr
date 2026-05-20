import {
    Body,
    Controller,
    Delete,
    Get,
    HttpException,
    HttpStatus,
    Inject,
    Param,
    Post,
    Put,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { JwtAuthLocalGuard } from '../guard/jwt-local.guard';
import { UserFullDto } from '@ubs-platform/users-common';
import { Roles, RolesGuard } from '@ubs-platform/users-roles';
import { UserAdminSearch } from 'libs/users-common/src/user-admin-search.dto';
import { CacheManagerService } from '@ubs-platform/cache-manager';

// TODO: Admin ile alakalı sorun çıkarsa tekrar ekle @Roles(['ADMIN'])

@Controller('_adm_/user')
@Roles(['ADMIN'])
export class UserAdminController {
    CACHE_PREFIX_MSC = 'usermsctrl';
    CACHE_PREFIX = 'userms';

    constructor(
        private userService: UserService,
        private cacheman: CacheManagerService,
    ) {}

    @Get()
    @UseGuards(JwtAuthLocalGuard, RolesGuard)
    async listAllUsers() {
        return await this.userService.fetchAllUsers();
    }

    @Get('_search')
    @UseGuards(JwtAuthLocalGuard, RolesGuard)
    async searchAllUsers(@Query() uas: UserAdminSearch) {
        return await this.userService.fetchAllUsersPaginated(uas);
    }

    @Get(':id')
    @UseGuards(JwtAuthLocalGuard, RolesGuard)
    async fetchFull(@Param() params: { id: any }) {
        return await this.userService.findFullInfo(params.id);
    }

    @Put()
    @UseGuards(JwtAuthLocalGuard, RolesGuard)
    async updateUser(@Body() full: UserFullDto) {
        if (full._id == null) {
            throw 'id gereklidir';
        }
        console.info(full);
        return await this.userService.editUserFullInformation(full);
    }

    @Post()
    @UseGuards(JwtAuthLocalGuard, RolesGuard)
    async createUser(@Body() full: UserFullDto) {
        return await this.userService.addUserFullInformation(full);
    }

    @Delete(':id')
    @UseGuards(JwtAuthLocalGuard, RolesGuard)
    async deleteUser(@Param() params: { id: any }) {
        const removedUserInfo = await this.userService.deleteUser(params.id);
        this.cacheman.invalidateStr(
            `${this.CACHE_PREFIX_MSC} findUserAuthFromId ${params.id}`,
        );
        return removedUserInfo;
    }
}
