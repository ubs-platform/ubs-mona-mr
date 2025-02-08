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
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { JwtAuthLocalGuard } from '../guard/jwt-local.guard';
import { UserFullDto } from '@mona/users/common';
import { Roles, RolesGuard } from '@mona/users/roles';

// TODO: Admin ile alakalı sorun çıkarsa tekrar ekle @Roles(['ADMIN'])

@Controller('_adm_/user')
@Roles(['ADMIN'])
export class UserAdminController {
    constructor(private userService: UserService) {}

    @Get()
    @UseGuards(JwtAuthLocalGuard, RolesGuard)
    async listAllUsers() {
        return await this.userService.fetchAllUsers();
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
        return await this.userService.deleteUser(params.id);
    }
}
