import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import { SocialComment } from '../model/comment';

import { UserAuthBackendDTO } from '@ubs-platform/users-common';
import {
    CommentAddDTO,
    CommentDTO,
    CommentEditDTO,
    CommentSearchDTO,
    ExistCommentAbilityDTO,
} from '@ubs-platform/social-common';
import { EntityOwnershipService } from '@ubs-platform/users-microservice-helper';
import { CommentMapper } from '../mapper/comment.mapper';
import { InjectModel } from '@nestjs/mongoose';
import { CommentMetaService } from './comment-meta.service';
import { CommentAbilityCheckService } from './comment-ability-check.service';
import { SearchUtil } from '@ubs-platform/crud-base';
import { SearchRequest, SearchResult } from '@ubs-platform/crud-base-common';
import { filter, lastValueFrom } from 'rxjs';
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

    async renameCommenterUserFullname(u: UserAuthBackendDTO) {
        //todo: bunu tekrar gözden geçir sanırım çalışmıyor?...

        await this.commentModel
            .aggregate([
                {
                    $match: {
                        byUserId: u.id,
                    },
                },
                {
                    $set: {
                        byFullname: u.name + ' ' + u.surname,
                    },
                },
            ])
            .exec();
    }

    // private fillChildrenWithParentIfEmpty(
    //     ...comments: Array<CommentSearchDTO | CommentDTO>
    // ) {
    //     for (let index = 0; index < comments.length; index++) {
    //         const comment = comments[index];
    //         if (!comment.childEntityId && !comment.childEntityName) {
    //             comment.childEntityId = comment.mainEntityId;
    //             comment.childEntityName = comment.mainEntityName;
    //         }
    //     }
    // }

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
        // this.fillChildrenWithParentIfEmpty();
        commentDto.childEntityId =
            commentDto.childEntityId || commentDto.mainEntityId;
        commentDto.childEntityName =
            commentDto.childEntityName || commentDto.mainEntityName;
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
        pagination: SearchRequest,
        currentUser: UserAuthBackendDTO,
        ...commentsSearchs: CommentSearchDTO[]
    ): Promise<SearchResult<CommentDTO>> {
        const sortingRotation = pagination.sortRotation == 'asc' ? 1 : -1;

        const sortingField: { [key: string]: 1 | -1 } =
            pagination.sortBy == 'creationDate'
                ? {
                      creationDate: sortingRotation,
                      _id: sortingRotation,
                  }
                : { votesLength: sortingRotation, _id: sortingRotation };

        // this.fillChildrenWithParentIfEmpty(...comments);
        const searchQueries = {
            $match: {
                $or: await this.commentFilterMatch(
                    commentsSearchs,
                    currentUser.id,
                ),
            },
        };

        if (searchQueries.$match.$or.length > 0) {
            return (
                await SearchUtil.modelSearch(
                    this.commentModel,
                    pagination.size,
                    pagination.page,
                    sortingField,
                    searchQueries,
                )
            ).mapAsync(async (a) => {
                const meta =
                    await this.commentMetaService.findOrCreateNewMeta(a);
                return await this.commentMapper.toDto(a, meta, currentUser);
            });
        } else {
            return {
                content: [],
                firstPage: true,
                lastPage: true,
                maxItemLength: 0,
                maxPagesIndex: 0,
                page: 0,
                size: 0,
            };
        }
        // mongodb aggregeration or conditions
    }

    private regexSearch(str: string): any {
        return { $regex: '.*' + str + '.*' };
    }

    private async commentFilterMatch(
        commentsSearch: CommentSearchDTO[],
        userId?: string,
    ): Promise<FilterQuery<any>[]> {
        const filters: FilterQuery<any>[] = [];

        for (let index = 0; index < commentsSearch.length; index++) {
            const commentSearch = commentsSearch[index];
            const currentCommentSearch = {
                mainEntityName: commentSearch.mainEntityName,
                entityGroup: commentSearch.entityGroup,
                ...(commentSearch.contentTextIn
                    ? {
                          textContent: this.regexSearch(
                              commentSearch.contentTextIn,
                          ),
                      }
                    : {}),
                ...(commentSearch.childEntityId
                    ? { childEntityId: commentSearch.childEntityId }
                    : {}),
                ...(commentSearch.childEntityName
                    ? { childEntityName: commentSearch.childEntityName }
                    : {}),
                ...(commentSearch.childOfCommentId
                    ? {
                          childOfCommentId: commentSearch.childOfCommentId,
                          isChild: true,
                      }
                    : { isChild: { $ne: true } }),
            };
            if (userId && commentSearch.mainEntityIdByOwner) {
                const entities = await lastValueFrom(
                    this.eoService.searchOwnershipUser({
                        entityGroup: commentSearch.entityGroup,
                        entityName: commentSearch.mainEntityName!,
                        userId,
                        capabilityAtLeastOne: ['OWNER'],
                    }),
                );
                entities.forEach((a) => {
                    filters.push({
                        ...currentCommentSearch,
                        mainEntityId: a.entityId,
                    });
                });
            } else {
                filters.push({
                    ...currentCommentSearch,
                    mainEntityId: commentSearch.mainEntityId,
                });
            }
        }
        return filters;
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
                $match: this.commentFilterMatch([comment]),
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

    async checkExistCommentAbilities(
        commentId: string,
        currentUser: any,
    ): Promise<ExistCommentAbilityDTO> {
        const comment = await this.commentModel.findById(commentId);
        if (comment) {
            return {
                canEdit: (
                    await this.commentAbilityCheckService.checkCanEdit(
                        comment,
                        currentUser,
                    )
                ).allow,
                canRemove: (
                    await this.commentAbilityCheckService.checkCanDelete(
                        comment,
                        currentUser,
                    )
                ).allow,
                userCommentAdmin:
                    (await this.commentAbilityCheckService.isUserOwnerOfRealEntity(
                        comment,
                        currentUser!,
                    )) != null,
            } as ExistCommentAbilityDTO;
        } else {
            throw new NotFoundException();
        }
    }
}
