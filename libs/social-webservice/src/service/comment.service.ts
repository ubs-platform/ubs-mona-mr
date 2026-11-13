import {
    BadRequestException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { FilterQuery, Model, Types } from 'mongoose';
import { SocialComment } from '@ubs-platform/social-entity-mongo';

import { Capability, UserAuthBackendDTO } from '@ubs-platform/users-common';
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
import { CommentFilterService } from './comment-filter.service';
import { ApplicationSocialRestrictionService } from './application-social-restriction.service';
import { isModerator } from '../consts/role-consts';
import { FilterDecision } from '../filter/comment-filter.engine';
import { MongooseSearchUtil } from '@ubs-platform/crud-base';
import { SearchRequest, SearchResult } from '@ubs-platform/crud-base-common';
import { filter, lastValueFrom } from 'rxjs';
import { Optional } from '@ubs-platform/crud-base-common/utils';
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
        private commentFilterService: CommentFilterService,
        private restrictionService: ApplicationSocialRestrictionService,
    ) { }

    /** Shadow yorumlar bu kadar gün sonra Mongo TTL ile silinir (moderatör "sakla" demezse). */
    private shadowRetentionMs() {
        const days = Number(process.env['SOCIAL_SHADOW_RETENTION_DAYS']) || 30;
        return days * 24 * 60 * 60 * 1000;
    }

    /**
     * Filtre kararının yorum akışını kesen kısmı. Dönen değer:
     * - 'DROP': hiçbir şey kaydetme, kullanıcıya başarılı gibi dön
     * - 'SHADOW' veya null: devam et (flag'ler decision'dan alınır)
     * REJECT_ERROR ve BAN_USER hata fırlatır.
     * Yorum metni hiçbir yere loglanmaz.
     */
    private async applyFilterDecision(
        decision: FilterDecision,
        currentUser: UserAuthBackendDTO,
    ): Promise<'DROP' | 'CONTINUE'> {
        if (decision.penaltyPoints > 0) {
            // TODO: user servise ceza puanı olayı gönderilecek (kapsam dışı). Şimdilik sadece işaret.
        }
        switch (decision.action) {
            case 'BAN_USER': {
                const until = new Date(
                    Date.now() + (decision.banDurationHours ?? 0) * 3600_000,
                );
                await this.restrictionService.restrictUser({
                    userId: currentUser.id,
                    restriction: 'COMMENT',
                    until: until.toISOString(),
                    note: 'auto-moderation',
                });
                throw new UnauthorizedException(
                    'commenting-not-allowed',
                    'mona.comments.userCommentBlockReason.disabled',
                );
            }
            case 'REJECT_ERROR':
                throw new BadRequestException('mona.comments.rejected-by-filter');
            case 'DROP':
                return 'DROP';
            default:
                return 'CONTINUE';
        }
    }

    /** DROP'ta kullanıcıya dönen sahte ama geçerli biçimli yorum. DB'ye yazılmaz. */
    private droppedCommentDto(
        commentDto: CommentAddDTO,
        currentUser: UserAuthBackendDTO,
    ): CommentDTO {
        const now = new Date();
        return {
            _id: new Types.ObjectId().toString(),
            entityGroup: commentDto.entityGroup,
            mainEntityName: commentDto.mainEntityName,
            mainEntityId: commentDto.mainEntityId,
            childEntityName: commentDto.childEntityName || commentDto.mainEntityName,
            childEntityId: commentDto.childEntityId || commentDto.mainEntityId,
            textContent: commentDto.textContent,
            byUserId: currentUser.id,
            byFullName: currentUser.name + ' ' + currentUser.surname,
            creationDate: now,
            lastEditDate: now,
            editCount: 0,
            isChild: !!commentDto.childOfCommentId?.trim(),
            childOfCommentId: commentDto.childOfCommentId || '',
            userDownVoted: false,
            userUpVoted: false,
            votesLength: 0,
            childCommentsCount: 0,
            userBanned: false,
        } as CommentDTO;
    }

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
        ip: string,
    ): Promise<CommentDTO> {
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
        const decision = await this.commentFilterService.evaluate(
            commentDto.textContent,
            commentDto.entityGroup,
        );
        if ((await this.applyFilterDecision(decision, currentUser)) == 'DROP') {
            return this.droppedCommentDto(commentDto, currentUser);
        }

        let commentMeta =
            await this.commentMetaService.findOrCreateNewMeta(commentDto);
        const parent = commentDto.childOfCommentId
            ? await this.commentModel.findById(commentDto.childOfCommentId)
            : null;
        // Shadow yoruma verilen cevap da shadow olur
        const shadow =
            decision.action == 'SHADOW' || parent?.moderationStatus == 'SHADOW';
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
        commentModel.ipAddress = ip;
        commentModel.flags = decision.flags;
        if (shadow) {
            commentModel.moderationStatus = 'SHADOW';
            commentModel.shadowExpiresAt = new Date(
                Date.now() + this.shadowRetentionMs(),
            );
        }
        const saved = await commentModel.save();
        // Shadow yorum sayaçlara yansımaz; moderatör serbest bırakırsa o zaman artar
        if (!shadow) {
            if (parent) {
                parent.childCommentsCount = !parent.childCommentsCount
                    ? 1
                    : parent.childCommentsCount + 1;
                await parent.save();
            }
        }
        if (!shadow) {
            await this.commentMetaService.increaseExisting(commentDto, commentMeta);
        }

        return this.commentMapper.toDto(saved, commentMeta, currentUser);
    }

    async searchComments(
        pagination: SearchRequest,
        currentUser: Optional<UserAuthBackendDTO>,
        ...commentsSearchs: CommentSearchDTO[]
    ): Promise<SearchResult<CommentDTO>> {
        // console.debug('searchComments called with', { pagination, commentsSearchs });

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
                    currentUser?.id,
                    currentUser,
                ),
            },
        };

        if (searchQueries.$match.$or.length > 0) {
            return (
                await MongooseSearchUtil.modelSearch(
                    this.commentModel,
                    pagination.size,
                    pagination.page,
                    sortingField,
                    searchQueries,
                )
            ).mapAsync(async (a) => {
                const meta =
                    await this.commentMetaService.findOrCreateNewMeta(a);
                return await this.commentMapper.toDto(a, meta, currentUser ?? undefined);
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
        currentUser?: Optional<UserAuthBackendDTO>,
    ): Promise<FilterQuery<any>[]> {
        const filters: FilterQuery<any>[] = [];
        const moderator = isModerator(currentUser);
        // Shadow yorumlar sadece yazarına ve moderatöre görünür
        const shadowVisibility: FilterQuery<any> = moderator
            ? {}
            : {
                $or: [
                    { moderationStatus: { $ne: 'SHADOW' } },
                    ...(userId ? [{ byUserId: userId }] : []),
                ],
            };

        for (let index = 0; index < commentsSearch.length; index++) {
            const commentSearch = commentsSearch[index];
            const flagList = moderator
                ? (commentSearch.flags ?? '')
                    .split(',')
                    .map((f) => f.trim())
                    .filter(Boolean)
                : [];
            const currentCommentSearch = {
                ...shadowVisibility,
                ...(flagList.length ? { flags: { $in: flagList } } : {}),
                ...(commentSearch.mainEntityName ? { mainEntityName: commentSearch.mainEntityName } : {}),
                ...(commentSearch.mainEntityId ? { mainEntityId: commentSearch.mainEntityId } : {}),
                ...(commentSearch.entityGroup ? { entityGroup: commentSearch.entityGroup } : {}),
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
                    // TODO: Eğer özellikle belirtilirse child yorumları da getirelim ama default olarak getirme. Kitap sahibi yorumlara bakarken childler gözden kaçıyor...
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
                        requestedCapabilities: [[Capability.OWNER], [Capability.EDIT], [Capability.VIEW]],
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
                    ...(commentSearch.mainEntityId
                        ? { mainEntityId: commentSearch.mainEntityId }
                        : {}),
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
                const decision = await this.commentFilterService.evaluate(
                    newCommetn.textContent,
                    comment.entityGroup,
                );
                if (
                    (await this.applyFilterDecision(decision, currentUser)) ==
                    'DROP'
                ) {
                    // düzenleme sessizce uygulanmaz, eski hali döner
                    const meta =
                        await this.commentMetaService.findOrCreateNewMeta(comment);
                    return this.commentMapper.toDto(comment, meta, currentUser);
                }
                if (decision.flags.length) {
                    comment.flags = [
                        ...new Set([...(comment.flags ?? []), ...decision.flags]),
                    ];
                }
                if (
                    decision.action == 'SHADOW' &&
                    comment.moderationStatus != 'SHADOW'
                ) {
                    // Zaten yayındaki yorum sayaçlara girmişti; shadow'a çekmek sayaçları bozmasın diye
                    // sadece görünürlüğü kapatıyoruz. Moderatör serbest bırakırsa sayaç tekrar artmaz.
                    comment.moderationStatus = 'SHADOW';
                    comment.shadowCounted = true;
                    comment.shadowExpiresAt = new Date(
                        Date.now() + this.shadowRetentionMs(),
                    );
                }
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
