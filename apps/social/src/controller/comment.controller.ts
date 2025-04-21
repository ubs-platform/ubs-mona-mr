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
    CommentAbilityDTO,
    ExistCommentAbilityDTO,
} from '@ubs-platform/social-common';
import { CommentService } from '../service/comment.service';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';
import { UserIntercept } from '../guard/UserIntercept';
import { CommentAbilityCheckService } from '../service/comment-ability-check.service';
import { CommentMetaService } from '../service/comment-meta.service';
import { SearchRequest } from '@ubs-platform/crud-base-common';

@Controller('comment')
export class CommentController {
    constructor(
        private commentService: CommentService,
        private commentAbility: CommentAbilityCheckService,
        private commntMetaService: CommentMetaService,
    ) {}
    @Post()
    @UseGuards(JwtAuthGuard)
    async addComment(
        @Body() comment: CommentAddDTO,
        @CurrentUser() user: UserAuthBackendDTO,
    ) {
        return await this.commentService.insertComment(comment, user);
    }

    @Get()
    @UseGuards(UserIntercept)
    async fetchComments(
        @Query() comment: CommentSearchDTO & SearchRequest,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        console.info(currentUser);
        return await this.commentService.searchComments(
            comment,
            currentUser,
            comment,
        );
    }

    @Post('/search')
    @UseGuards(UserIntercept)
    async searchCommentsMultiple(
        @Query() comment: SearchRequest,
        @Body() searchs: CommentSearchDTO[],
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        console.info(currentUser);
        return await this.commentService.searchComments(
            comment,
            currentUser,
            ...searchs,
        );
    }

    @Get('count')
    @UseGuards(UserIntercept)
    async commentCount(@Query() comment: CommentSearchDTO) {
        return await this.commntMetaService.count(comment);
    }

    @Get('ability')
    @UseGuards(UserIntercept)
    async canComment(
        @Query() comment: CommentSearchDTO,
        @CurrentUser() currentUser,
    ): Promise<CommentingAbilityDTO> {
        return await this.commentAbility.checkCommentingAbilities(
            comment,
            currentUser,
        );
    }

    @Get('ability/:id')
    @UseGuards(UserIntercept)
    async fetch(
        @Param("id") commentId: string,
        @CurrentUser() currentUser,
    ): Promise<ExistCommentAbilityDTO> {
        return await this.commentService.checkExistCommentAbilities(
            commentId,
            currentUser,
        );
    }


    @Get('status')
    async commentingStatus(
        @Query() comment: CommentMetaSearchDTO,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        return await this.commntMetaService.fetchStatus(comment);
    }

    @Get('block-user')
    @UseGuards(UserIntercept)
    async fetchBlockedUsers(@Query() comment: CommentMetaSearchDTO) {
        return await this.commntMetaService.getBlockedUsers(comment);
    }

    @Put('block-user')
    @UseGuards(UserIntercept)
    async banUser(@Body() comment: BanUserDTO) {
        await this.commntMetaService.banUser(comment);
    }

    @Put('unblock-user')
    @UseGuards(UserIntercept)
    async unbanUser(@Body() comment: BanUserDTO) {
        await this.commntMetaService.unbanUser(comment);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async deleteComment(
        @Param('id') id: string,
        @CurrentUser() currentUser,
    ): Promise<void> {
        await this.commentService.deleteComment(id, currentUser);
    }
    @Put('status')
    async setCommentingStatus(@Body() comment: NewCommentingStatus) {
        console.info('status');
        await this.commntMetaService.setStatus(comment, comment.newStatus);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    async editComment(
        @Param('id') id: string,
        @CurrentUser() currentUser,
        @Body() newCommetn: CommentEditDTO,
    ): Promise<CommentDTO> {
        return await this.commentService.editComment(
            id,
            newCommetn,
            currentUser,
        );
    }

    @Put(':id/upvote')
    @UseGuards(JwtAuthGuard)
    async upvote(
        @Param('id') id: string,
        @CurrentUser() currentUser,
    ): Promise<CommentDTO> {
        return await this.commentService.voteComment(id, currentUser, 'UP');
    }

    @Put(':id/downvote')
    @UseGuards(JwtAuthGuard)
    async downvote(
        @Param('id') id: string,
        @CurrentUser() currentUser,
    ): Promise<CommentDTO> {
        return await this.commentService.voteComment(id, currentUser, 'DOWN');
    }
}
