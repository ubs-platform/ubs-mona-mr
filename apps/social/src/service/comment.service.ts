import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { SocialComment } from '../model/comment';

import { UserAuthBackendDTO } from '@ubs-platform/users-common';
import {
    CommentAddDTO,
    CommentDTO,
    CommentEditDTO,
    CommentSearchDTO,
    PaginationRequest,
    PaginationResult,
} from '@ubs-platform/social-common';
import { EntityOwnershipService } from '@ubs-platform/users-microservice-helper';
import { CommentMapper } from '../mapper/comment.mapper';
import { InjectModel } from '@nestjs/mongoose';
import { CommentMetaService } from './comment-meta.service';
import { CommentAbilityCheckService } from './comment-ability-check.service';
@Injectable()
export class CommentService {
    constructor(
        @InjectModel(SocialComment.name)
        private commentModel: Model<SocialComment>,
        // @InjectModel(SocialCommentMeta.name)
        // private commentMetaModel: Model<SocialCommentMeta>,
        private eoService: EntityOwnershipService,
        private commentMapper: CommentMapper,
        private commentMetaService: CommentMetaService,
        private commentAbilityCheckService: CommentAbilityCheckService,
    ) {}

    private fillChildrenWithParentIfEmpty(
        comment: CommentSearchDTO | CommentDTO,
    ) {
        if (!comment.childEntityId && !comment.childEntityName) {
            comment.childEntityId = comment.mainEntityId;
            comment.childEntityName = comment.mainEntityName;
        }
    }

    public async insertComment(
        commentDto: CommentAddDTO,
        currentUser: UserAuthBackendDTO,
    ) {
        const status =
            await this.commentAbilityCheckService.checkCommentingAbilities(
                commentDto,
                currentUser,
            );
        if (!status.userCanComment) {
            throw new UnauthorizedException(
                'commenting-not-allowed',
                status.userCommentBlockReason,
            );
        }
        let commentMeta =
            await this.commentMetaService.findOrCreateNewMeta(commentDto);
        this.fillChildrenWithParentIfEmpty(commentDto);
        const commentModel = new this.commentModel();
        this.commentMapper.moveToEntity(commentModel, commentDto);
        commentModel.byUserId = currentUser.id;
        commentModel.byFullName = currentUser.name + ' ' + currentUser.surname;
        commentModel.votesLength = 0;
        const saved = await commentModel.save();
        if (commentDto.childOfCommentId) {
            const parent = await this.commentModel.findById(
                commentDto.childOfCommentId,
            );
            if (parent) {
                parent.childCommentsCount = !parent.childCommentsCount
                    ? 1
                    : parent.childCommentsCount + 1;
                await parent.save();
            }
        }
        await this.commentMetaService.increaseExisting(commentDto, commentMeta);

        return this.commentMapper.toDto(saved, commentMeta, currentUser);
    }

    async searchComments(
        comment: CommentSearchDTO & PaginationRequest,
        currentUser: UserAuthBackendDTO,
    ): Promise<PaginationResult> {
        const sortingRotation = comment.sortRotation == 'ASC' ? 1 : -1;
        const sortingField =
            comment.sortField == 'CREATIONDATE'
                ? {
                      creationDate: sortingRotation,
                      _id: sortingRotation,
                  }
                : { votesLength: sortingRotation, _id: sortingRotation };

        this.fillChildrenWithParentIfEmpty(comment);
        // const ls = await this.commentModel.find({
        //   childEntityId: comment.childEntityId,
        //   childEntityName: comment.childEntityName,
        //   mainEntityId: comment.mainEntityId,
        //   mainEntityName: comment.mainEntityName,
        //   entityGroup: comment.entityGroup,
        // });
        const results = await this.commentModel.aggregate([
            {
                $match: this.commntFilterMatch(comment),
            },
            {
                $facet: {
                    total: [{ $count: 'total' }],
                    //@ts-ignore
                    data: [
                        { $sort: sortingField },
                        { $skip: comment.size * comment.page },
                        // lack of convert to int
                        { $limit: parseInt(comment.size as any as string) },
                    ].filter((a) => a),
                },
            },
        ]);

        const maxItemLength = results[0]?.total[0]?.total || 0;
        // return { list, maxItemLength };
        return await this.commentsPaginatedToDto(
            comment,
            results,
            currentUser,
            maxItemLength,
        );
    }

    private commntFilterMatch(
        comment: CommentSearchDTO,
    ): import('mongoose').FilterQuery<any> {
        return {
            childEntityId: comment.childEntityId,
            childEntityName: comment.childEntityName,
            mainEntityId: comment.mainEntityId,
            mainEntityName: comment.mainEntityName,
            entityGroup: comment.entityGroup,
            ...(comment.childOfCommentId
                ? { childOfCommentId: comment.childOfCommentId, isChild: true }
                : { isChild: { $ne: true } }),
        };
    }

    private async commentsPaginatedToDto(
        comment: CommentSearchDTO & PaginationRequest,
        results: any[],
        currentUser: UserAuthBackendDTO,
        maxItemLength: any,
    ): Promise<PaginationResult> {
        const meta = await this.commentMetaService.findOrCreateNewMeta(comment);
        const commentDtos: Array<CommentDTO> = [];
        for (let index = 0; index < results[0].data.length; index++) {
            const comment = results[0].data[index];
            commentDtos.push({
                ...(await this.commentMapper.toDto(comment, meta, currentUser)),
            });
        }

        return {
            page: comment.page,
            size: comment.size,
            list: commentDtos,
            maxItemLength,
        };
    }

    async deleteComment(commentId: string, currentUser: UserAuthBackendDTO) {
        const commentWillBeDeleted =
            await this.commentModel.findById(commentId);
        if (commentWillBeDeleted) {
            var { allow } =
                await this.commentAbilityCheckService.checkCanDelete(
                    commentWillBeDeleted,
                    currentUser,
                );

            if (allow) {
                await commentWillBeDeleted.deleteOne();
            } else {
                console.info('remove-comment-not-allowed');
                throw new UnauthorizedException();
            }
        }
    }

    async editComment(
        id: string,
        newCommetn: CommentEditDTO,
        currentUser: UserAuthBackendDTO,
    ): Promise<CommentDTO> {
        const comment = await this.commentModel.findById(id);
        if (!comment) {
            throw new NotFoundException('comment', id);
        } else {
            var { allow } = await this.commentAbilityCheckService.checkCanEdit(
                comment,
                currentUser,
            );

            if (allow) {
                comment.textContent = newCommetn.textContent;
                comment.editCount = 1 + comment.editCount;
                comment.lastEditDate = new Date();
                comment.save();
                const meta =
                    await this.commentMetaService.findOrCreateNewMeta(comment);
                return this.commentMapper.toDto(comment, meta, currentUser);
            } else {
                throw new UnauthorizedException();
            }
        }
    }

    async voteComment(
        id: string,
        currentUser: UserAuthBackendDTO,
        u: 'UP' | 'DOWN',
    ): Promise<CommentDTO> {
        const ac = await this.commentModel.findById(id);
        if (ac) {
            const upvoteIndex = ac.upvoteUserIds.indexOf(currentUser.id);
            const downvoteIndex = ac.downvoteUserIds.indexOf(currentUser.id);
            if (!ac.votesLength || Number.isNaN(ac.votesLength)) {
                ac.votesLength = 0;
            }
            if (upvoteIndex > -1) {
                ac.upvoteUserIds.splice(upvoteIndex, 1);
                ac.votesLength = ac.votesLength - 1;
            }
            if (downvoteIndex > -1) {
                ac.downvoteUserIds.splice(downvoteIndex, 1);
                ac.votesLength = ac.votesLength + 1;
            }
            if (u == 'DOWN' && downvoteIndex == -1) {
                ac.downvoteUserIds.push(currentUser.id);
                ac.votesLength = ac.votesLength - 1;
            } else if (u == 'UP' && upvoteIndex == -1) {
                ac.upvoteUserIds.push(currentUser.id);
                ac.votesLength = ac.votesLength + 1;
            }
            ac.save();
            const meta = await this.commentMetaService.findOrCreateNewMeta(ac);

            return this.commentMapper.toDto(ac, meta, currentUser);
        } else {
            throw new NotFoundException('comment', id);
        }
    }

    async commentCount(comment: CommentSearchDTO) {
        // const meta = await this.findOrCreateNewMeta(comment);
        // return meta.length
        const commentCount = await this.commentModel.aggregate([
            {
                $match: this.commntFilterMatch(comment),
            },
            {
                $count: 'total',
            },
        ]);
        return commentCount?.[0]?.total || 0;
    }

    async clearUserCommentsAll(byUserId: string) {
        await this.commentModel.deleteMany({ byUserId });
    }
}
