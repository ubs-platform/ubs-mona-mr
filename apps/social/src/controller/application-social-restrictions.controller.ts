import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApplicationSocialRestrictionSearchDTO,
    ApplicationSocialRestrictionAddDTO,
} from '@ubs-platform/social-common';
import { ApplicationSocialRestrictionService } from '../service/application-social-restriction.service';
import { JwtAuthGuard } from '@ubs-platform/users-microservice-helper';
import { RolesGuard, Roles } from '@ubs-platform/users-roles';
import { ModeratorRole } from '../consts/role-consts';

@Controller('application-social-restriction')
export class ApplicationSocialRestrictionController {
    constructor(private srs: ApplicationSocialRestrictionService) {}

    @Get('admin/:userId/:restriction')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles([ModeratorRole])
    async restrictionDetail(
        @Param() search: ApplicationSocialRestrictionSearchDTO,
    ) {
        return await this.srs.userRestrictionDetails(search);
    }

    @Get(':userId/:restriction')
    async hasRestriction(
        @Param() search: ApplicationSocialRestrictionSearchDTO,
    ) {
        return await this.srs.isUserRestrictedFrom(search);
    }

    @Post('admin')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles([ModeratorRole])
    async addRestriction(@Body() p: ApplicationSocialRestrictionAddDTO) {
        // 
        return await this.srs.restrictUser(p);
    }

    @Delete('admin/:userId/:restriction')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles([ModeratorRole])
    async removeRestriction(@Param() p: ApplicationSocialRestrictionSearchDTO) {
        return await this.srs.removeCommentRestriction(p);
    }
}
