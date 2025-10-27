import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { SocialComment } from '../model/comment';
import {
    CAPABILITY_NAME_COMMENT_OWNER,
    CAPABILITY_NAME_ENTITY_OWNER,
    ENTITY_GROUP as SOCIAL_ENTITY_GROUP,
    ENTITY_NAME_COMMENTS as SOCIAL_ENTITY_NAME_COMMENTS,
} from '@ubs-platform/social-consts';

import {
    EntityOwnershipDTO,
    UserAuthBackendDTO,
} from '@ubs-platform/users-common';
import {
    CanManuplateComment,
    CommentAbilityDTO as CommentingAbilityDTO,
    CommentSearchDTO,
    ExistCommentAbilityDTO,
} from '@ubs-platform/social-common';
import { EntityOwnershipService } from '@ubs-platform/users-microservice-helper';
import { CommentMapper } from '../mapper/comment.mapper';
import { InjectModel } from '@nestjs/mongoose';
import { lastValueFrom } from 'rxjs';
import { SocialCommentMeta } from '../model/comment-meta';
import { CommentMetaService } from './comment-meta.service';
import { ApplicationSocialRestrictionService } from './application-social-restriction.service';
@Injectable()
export class CommentAbilityCheckService {

    constructor(
        private eoService: EntityOwnershipService,
        private commentMetaService: CommentMetaService,
        private appSocialRestrictionService: ApplicationSocialRestrictionService,
    ) { }
    // todo: support for multiple 
    public async checkCanEdit(
        socialComment: SocialComment,
        currentUser: any,
    ): Promise<CanManuplateComment> {

        if (currentUser != null) {
            let allow = this.isCommentPoster(socialComment, currentUser.id);

            return { allow };
        } else {
            return { allow: false };
        }
    }



    public async checkCanDelete(
        socialComment: SocialComment,
        currentUser: UserAuthBackendDTO,
    ): Promise<CanManuplateComment> {
        if (currentUser != null) {
            let allow = this.isCommentPoster(socialComment, currentUser.id);

            if (!allow) {
                const e = await this.isUserOwnerOfRealEntity(
                    socialComment,
                    currentUser,
                );
                allow = e as any ?? false as any;
            }

            return { allow };
        }
        return { allow: false };
    }

    isCommentPoster(socialComment: SocialComment, userId: string) {
        return socialComment.byUserId == userId;
    }

    public async realEntityOwnership(saved: SocialComment) {
        return await lastValueFrom(
            this.eoService.searchOwnership({
                entityGroup: saved.entityGroup,
                entityId: saved.mainEntityId,
                entityName: saved.mainEntityName,
            }),
        );
    }

    // Test

    public async isUserOwnerOfRealEntity(
        saved: SocialComment,
        user: UserAuthBackendDTO,
        alreadyExist?: EntityOwnershipDTO
    ) {
        if (user) {
            if (alreadyExist) {
                return alreadyExist.userCapabilities.find(a => a.userId == user.id) != null
            }

            return await lastValueFrom(
                this.eoService.hasOwnership({
                    entityGroup: saved.entityGroup,
                    entityId: saved.mainEntityId,
                    entityName: saved.mainEntityName,
                    userId: user.id,
                    capabilityAtLeastOne: [CAPABILITY_NAME_ENTITY_OWNER, "EDITOR", CAPABILITY_NAME_COMMENT_OWNER],
                }),
            );
        } else {
            return false;
        }
    }

    async checkCommentingAbilities(
        comment: CommentSearchDTO,
        currentUser: UserAuthBackendDTO,
    ): Promise<CommentingAbilityDTO> {
        const meta = await this.commentMetaService.findOrCreateNewMeta(comment);
        if (meta.commentingStatus == 'ALLOW') {
            if (currentUser) {
                // ⓈⒶBANCI - ALEYKÜM SELAM
                const globalBan =
                    await this.appSocialRestrictionService.userRestrictionDetails(
                        {
                            userId: currentUser.id,
                            restriction: 'COMMENT',
                        },
                    );

                if (globalBan != null) {
                    return {
                        userCanComment: false,
                        userCommentBlockReason:
                            'mona.comments.userCommentBlockReason.disabled',
                        extraNote: globalBan.note,
                    };
                } else if (
                    meta.commentingDisabledUserIds.includes(currentUser.id)
                ) {
                    return {
                        userCanComment: false,
                        userCommentBlockReason:
                            'mona.comments.userCommentBlockReason.disabled',
                    };
                } else {
                    return {
                        userCanComment: true,
                        userCommentBlockReason: '',
                    };
                }
            } else {
                return {
                    userCanComment: false,
                    userCommentBlockReason:
                        'mona.comments.userCommentBlockReason.not-logged',
                };
            }
        } else
            return {
                userCanComment: false,
                userCommentBlockReason:
                    'mona.comments.userCommentBlockReason.disabled',
            };
    }
}
