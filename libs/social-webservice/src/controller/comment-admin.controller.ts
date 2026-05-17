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
} from '@ubs-platform/social-common';
import { CommentService } from '../service/comment.service';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';
import { UserIntercept } from '../guard/UserIntercept';
import { CommentAbilityCheckService } from '../service/comment-ability-check.service';
import { CommentMetaService } from '../service/comment-meta.service';
import { Roles, RolesGuard } from '@ubs-platform/users-roles';
import { ModeratorRole } from '../consts/role-consts';

@Controller('comment/admin')
export class CommentAdminController {
    constructor(
        private commentService: CommentService,
        private commentAbility: CommentAbilityCheckService,
        private commntMetaService: CommentMetaService,
    ) {}

    @Delete('user-id/:userId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles([ModeratorRole])
    async clearCommentsFromThatUserId(@Param('userId') userId: string) {
        await this.commentService.clearUserCommentsAll(userId);
    }
}
