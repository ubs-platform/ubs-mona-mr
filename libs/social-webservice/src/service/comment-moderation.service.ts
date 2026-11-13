import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SearchRequest } from '@ubs-platform/crud-base-common';
import { MongooseSearchUtil } from '@ubs-platform/crud-base';
import {
    CommentDTO,
    CommentFlagEditDTO,
    CommentModerationSearchDTO,
} from '@ubs-platform/social-common';
import { SocialComment } from '@ubs-platform/social-entity-mongo';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';
import { CommentMapper } from '../mapper/comment.mapper';
import { CommentMetaService } from './comment-meta.service';

/** Moderatör/admin işlemleri: flag yönetimi, shadow yorumları saklama/serbest bırakma. */
@Injectable()
export class CommentModerationService {
    constructor(
        @InjectModel(SocialComment.name)
        private commentModel: Model<SocialComment>,
        private commentMapper: CommentMapper,
        private commentMetaService: CommentMetaService,
    ) {}

    async editFlags(id: string, edit: CommentFlagEditDTO) {
        const comment = await this.mustFind(id);
        const flags = new Set(comment.flags ?? []);
        (edit.add ?? []).map((f) => f.trim()).filter(Boolean).forEach((f) => flags.add(f));
        (edit.remove ?? []).forEach((f) => flags.delete(f.trim()));
        comment.flags = [...flags];
        await comment.save();
    }

    /** Shadow yorumu otomatik silinmekten çıkarır (örn. aimoderator için veri olarak saklamak). */
    async keepShadow(id: string) {
        const comment = await this.mustFind(id);
        comment.shadowExpiresAt = undefined;
        await comment.save();
    }

    /** Yanlış pozitif: yorumu herkese görünür yapar. Sayaçlar bu noktada güncellenir. */
    async releaseShadow(id: string) {
        const comment = await this.mustFind(id);
        if (comment.moderationStatus !== 'SHADOW') return;
        comment.moderationStatus = 'VISIBLE';
        comment.shadowExpiresAt = undefined;
        const alreadyCounted = !!comment.shadowCounted;
        comment.shadowCounted = undefined;
        await comment.save();
        if (alreadyCounted) return;

        const meta = await this.commentMetaService.findOrCreateNewMeta(comment);
        await this.commentMetaService.increaseExisting(comment as any, meta);
        if (comment.childOfCommentId) {
            await this.commentModel.updateOne(
                { _id: comment.childOfCommentId },
                { $inc: { childCommentsCount: 1 } },
            );
        }
    }

    async deleteComment(id: string) {
        await this.commentModel.findByIdAndDelete(id);
    }

    async search(
        pagination: SearchRequest,
        search: CommentModerationSearchDTO,
        currentUser: UserAuthBackendDTO,
    ) {
        const flags = (search.flags ?? '')
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean);
        const match: Record<string, any> = {
            ...(flags.length ? { flags: { $in: flags } } : {}),
            ...(search.moderationStatus
                ? { moderationStatus: search.moderationStatus }
                : {}),
            ...(search.entityGroup ? { entityGroup: search.entityGroup } : {}),
        };
        // Filtresiz çağrı tüm yorumları döker; en az bir kriter iste.
        if (Object.keys(match).length === 0) {
            match.$or = [
                { 'flags.0': { $exists: true } },
                { moderationStatus: 'SHADOW' },
            ];
        }
        const dir = pagination.sortRotation == 'asc' ? 1 : -1;
        const result = await MongooseSearchUtil.modelSearch(
            this.commentModel,
            pagination.size,
            pagination.page,
            { creationDate: dir, _id: dir },
            { $match: match },
        );
        return result.mapAsync(async (a) => {
            const meta = await this.commentMetaService.findOrCreateNewMeta(a);
            return (await this.commentMapper.toDto(a, meta, currentUser)) as CommentDTO;
        });
    }

    private async mustFind(id: string) {
        const comment = await this.commentModel.findById(id);
        if (!comment) throw new NotFoundException('comment', id);
        return comment;
    }
}
