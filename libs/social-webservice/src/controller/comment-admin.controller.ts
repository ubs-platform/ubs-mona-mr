import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    CurrentUser,
    JwtAuthGuard,
} from '@ubs-platform/users-microservice-helper';
import {
    CommentAbilityDTO as CommentingAbilityDTO,
    CommentAddDTO,
    CommentEditDTO,
    CommentSearchDTO,
    CanManuplateComment,
    CommentDTO,
    BanUserDTO,
    CommentMetaSearchDTO,
    NewCommentingStatus,
    CommentFilterPatternAddDTO,
    CommentFlagEditDTO,
    CommentModerationSearchDTO,
} from '@ubs-platform/social-common';
import { CommentService } from '../service/comment.service';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';
import { UserIntercept } from '../guard/UserIntercept';
import { CommentAbilityCheckService } from '../service/comment-ability-check.service';
import { CommentMetaService } from '../service/comment-meta.service';
import { Roles, RolesGuard } from '@ubs-platform/users-roles';
import { CommentFilterService } from '../service/comment-filter.service';
import { CommentModerationService } from '../service/comment-moderation.service';
import { SearchRequest } from '@ubs-platform/crud-base-common';
import { ModeratorRole } from '../consts/role-consts';

@Controller('comment/admin')
export class CommentAdminController {
    constructor(
        private commentService: CommentService,
        private commentAbility: CommentAbilityCheckService,
        private commntMetaService: CommentMetaService,
        private filterService: CommentFilterService,
        private moderationService: CommentModerationService,
    ) {}

    @Delete('user-id/:userId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles([ModeratorRole])
    async clearCommentsFromThatUserId(@Param('userId') userId: string) {
        await this.commentService.clearUserCommentsAll(userId);
    }

    // ---- Filtre pattern'leri ----

    @Get('filter-pattern')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles([ModeratorRole])
    async listPatterns() {
        return await this.filterService.list();
    }

    @Post('filter-pattern')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles([ModeratorRole])
    async addPattern(@Body() dto: CommentFilterPatternAddDTO) {
        return await this.filterService.create(dto);
    }

    @Put('filter-pattern/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles([ModeratorRole])
    async updatePattern(
        @Param('id') id: string,
        @Body() dto: CommentFilterPatternAddDTO,
    ) {
        return await this.filterService.update(id, dto);
    }

    @Delete('filter-pattern/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles([ModeratorRole])
    async deletePattern(@Param('id') id: string) {
        await this.filterService.delete(id);
    }

    // ---- Flag / shadow moderasyonu ----

    /** Flag'li ve/veya shadow yorumları listeler (aimoderator da bunu kullanabilir). */
    @Get('flagged')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles([ModeratorRole])
    async searchFlagged(
        @Query() search: CommentModerationSearchDTO,
        @Query() pagination: SearchRequest,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        return await this.moderationService.search(
            pagination,
            search,
            currentUser,
        );
    }

    @Put(':id/flags')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles([ModeratorRole])
    async editFlags(@Param('id') id: string, @Body() edit: CommentFlagEditDTO) {
        await this.moderationService.editFlags(id, edit);
    }

    /** Shadow yorumu otomatik silinmeden çıkarır */
    @Put(':id/shadow/keep')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles([ModeratorRole])
    async keepShadow(@Param('id') id: string) {
        await this.moderationService.keepShadow(id);
    }

    /** Yanlış pozitif: shadow yorumu herkese görünür yapar */
    @Put(':id/shadow/release')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles([ModeratorRole])
    async releaseShadow(@Param('id') id: string) {
        await this.moderationService.releaseShadow(id);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles([ModeratorRole])
    async deleteAsModerator(@Param('id') id: string) {
        await this.moderationService.deleteComment(id);
    }
}
