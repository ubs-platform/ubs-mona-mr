import { Injectable } from '@nestjs/common';
import {
    CanManuplateComment,
    CommentAddDTO,
    CommentDTO,
} from '@ubs-platform/social-common';
import { SocialComment } from '../model/comment';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';
import { lastValueFrom } from 'rxjs';
import { CommentAbilityCheckService } from '../service/comment-ability-check.service';
import { SocialCommentMeta } from '../model/comment-meta';

@Injectable()
export class CommentMapper {
    /**
     *
     */
    constructor(private commentAbilityService: CommentAbilityCheckService) {}

    async toDto(
        comment: SocialComment,
        commentMeta: SocialCommentMeta,
        currentUser?: UserAuthBackendDTO,
    ) {
        return {
            byFullName: comment.byFullName,
            byUserId: comment.byUserId,
            childEntityId: comment.childEntityId,
            childEntityName: comment.childEntityName,
            mainEntityId: comment.mainEntityId,
            mainEntityName: comment.mainEntityName,
            entityGroup: comment.entityGroup,
            editCount: comment.editCount,
            lastEditDate: comment.lastEditDate,
            creationDate: comment.creationDate,
            textContent: comment.textContent,
            childOfCommentId: comment.childOfCommentId,
            isChild: comment.isChild,
            childCommentsCount: comment.childCommentsCount,
            _id: comment._id,
            votesLength: comment.votesLength,
            //TODO: 
            canEdit: (
                await this.commentAbilityService.checkCanEdit(
                    comment,
                    currentUser,
                )
            ).allow,
            canRemove: (
                await this.commentAbilityService.checkCanDelete(
                    comment,
                    currentUser!,
                )
            ).allow,
            userCommentAdmin:
                (await this.commentAbilityService.isUserOwnerOfRealEntity(
                    comment,
                    currentUser!,
                )) != null,
            userDownVoted:
                currentUser != null &&
                comment.downvoteUserIds?.includes(currentUser.id),
            userUpVoted:
                currentUser != null &&
                comment.upvoteUserIds?.includes(currentUser.id),
            userBanned: commentMeta.commentingDisabledUserIds.includes(
                comment.byUserId + '',
            ),
        } as CommentDTO;
    }

    moveToEntity(
        commentModel: import('mongoose').Document<unknown, any, SocialComment> &
            Omit<SocialComment & Required<{ _id: String }>, never>,
        commentDto: CommentAddDTO,
    ) {
        commentModel.textContent = commentDto.textContent;
        commentModel.mainEntityName = commentDto.mainEntityName;
        commentModel.mainEntityId = commentDto.mainEntityId;
        commentModel.childEntityName =
            commentDto.childEntityName || commentDto.mainEntityName;
        commentModel.childEntityId =
            commentDto.childEntityId || commentDto.mainEntityId;
        commentModel.entityGroup = commentDto.entityGroup;
        commentModel.childOfCommentId = commentDto.childOfCommentId || '';
        commentModel.isChild = commentDto.childOfCommentId?.trim()
            ? true
            : false;
    }
}
