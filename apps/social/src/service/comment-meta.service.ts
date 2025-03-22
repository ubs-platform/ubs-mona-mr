import { Injectable, NotFoundException } from '@nestjs/common';
import { Document, Model } from 'mongoose';

import {
    BanUserDTO,
    CommentMetaSearchDTO,
    CommentSearchDTO,
} from '@ubs-platform/social-common';
import { InjectModel } from '@nestjs/mongoose';
import { SocialCommentMeta } from '../model/comment-meta';
import { UserService } from '@ubs-platform/users-microservice-helper';
import { UserDTO } from '@ubs-platform/users-common';
@Injectable()
export class CommentMetaService {
    constructor(
        @InjectModel(SocialCommentMeta.name)
        private commentMetaModel: Model<SocialCommentMeta>,
        private userService: UserService,
    ) {}

    public async findOrCreateNewMeta(commentDto: CommentMetaSearchDTO) {
        let commentMeta = await this.commentMetaModel.findOne({
            entityGroup: commentDto.entityGroup,
            mainEntityId: commentDto.mainEntityId,
            mainEntityName: commentDto.mainEntityName,
        });
        if (commentMeta == null) {
            commentMeta = new this.commentMetaModel({
                entityGroup: commentDto.entityGroup,
                mainEntityId: commentDto.mainEntityId,
                mainEntityName: commentDto.mainEntityName,
                commentingStatus: 'ALLOW',
                bannedUsers: [],
                length: 0,
            });

            await commentMeta.save();
        }
        return commentMeta;
    }

    public async increase(commentDto: CommentSearchDTO) {
        const u = await this.findOrCreateNewMeta(commentDto);
        return await this.increaseExisting(commentDto, u);
    }

    public async increaseExisting(
        commentDto: CommentSearchDTO,
        u: SocialCommentMeta &
            Document &
            Omit<
                SocialCommentMeta &
                    Required<{
                        _id: String;
                    }>,
                never
            >,
    ) {
        const willBeIncreased = u.subItemLengths.findIndex(
            (a) =>
                a.childEntityId == commentDto.childEntityId &&
                a.childEntityName == commentDto.childEntityName,
        );
        if (willBeIncreased > -1) {
            u.subItemLengths[willBeIncreased].length =
                u.subItemLengths[willBeIncreased].length + 1;
        } else {
            u.subItemLengths.push({
                childEntityId: commentDto.childEntityId!,
                childEntityName: commentDto.childEntityName!,
                length: 1,
            });
        }
        // debugger;
        await u.markModified('subItemLengths');
        await u.save();
    }

    public async count(commentDto: CommentSearchDTO) {
        const u = await this.findOrCreateNewMeta(commentDto);
        const willBeIncreased = u.subItemLengths.find(
            (a) =>
                a.childEntityId == commentDto.childEntityId &&
                a.childEntityName == commentDto.childEntityName,
        );
        if (willBeIncreased) {
            return willBeIncreased.length;
        } else {
            return 0;
        }
    }

    async banUser(comment: BanUserDTO) {
        const u = await this.findOrCreateNewMeta(comment);
        if (u && !u.commentingDisabledUserIds.includes(comment.byUserId)) {
            u.commentingDisabledUserIds.push(comment.byUserId);
            await u.save();
        }
    }

    async unbanUser(comment: BanUserDTO) {
        const u = await this.findOrCreateNewMeta(comment);
        const index = u.commentingDisabledUserIds.indexOf(comment.byUserId);
        if (u && index > -1) {
            u.commentingDisabledUserIds.splice(index, 1);
            await u.save();
        }
    }

    async fetchStatus(comment: CommentMetaSearchDTO) {
        const u = await this.findOrCreateNewMeta(comment);
        return { status: u.commentingStatus };
    }

    async setStatus(
        comment: CommentMetaSearchDTO,
        newStatus: 'ALLOW' | 'DISABLE' | 'ARCHIVE',
    ) {
        const u = await this.findOrCreateNewMeta(comment);
        u.commentingStatus = newStatus;
        await u.save();
    }

    async getBlockedUsers(comment: CommentMetaSearchDTO) {
        const u = await this.findOrCreateNewMeta(comment);
        const list: UserDTO[] = [];
        for (
            let index = 0;
            index < u.commentingDisabledUserIds.length;
            index++
        ) {
            const userId = u.commentingDisabledUserIds[index];
            try {
                const user = await this.userService.findUserAuth(userId);
                list.push({
                    name: user.name,
                    surname: user.surname,
                    id: user.id,
                } as UserDTO);
            } catch (e) {
                console.error(e);
            }
        }

        return list;
    }
}
