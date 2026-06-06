import {
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { ApiKey, ApiKeyDocument } from '@ubs-platform/users-entity-mongo';
import {
    ApiKeyCreateDTO,
    ApiKeyCreatedResponseDTO,
    ApiKeyDTO,
} from '@ubs-platform/users-common';

@Injectable()
export class ApiKeyService {

    private readonly logger = new Logger(ApiKeyService.name, { timestamp: true });

    /** Minimum interval (ms) between lastUsedAt writes to avoid write storms */
    private static readonly LAST_USED_WRITE_THROTTLE_MS = 60_000;

    constructor(
        @InjectModel(ApiKey.name)
        private apiKeyModel: Model<ApiKey>,
    ) { }

    // ─── Create ────────────────────────────────────────────────────────────────
   async findById(keyId: string): Promise<ApiKeyDTO | null> {
        const doc = await this.apiKeyModel.findById(keyId).lean().exec();
        return doc ? this.toDTO(doc) : null;
    }

    async create(
        requestingUserId: string,
        dto: ApiKeyCreateDTO,
    ): Promise<ApiKeyCreatedResponseDTO> {
        const rawKey = this.generateRawKey();
        const keyHash = this.hashKey(rawKey);

        const doc = await this.apiKeyModel.create({
            keyHash,
            name: dto.name,
            userId: dto.entityOwnershipGroupId ? undefined : requestingUserId,
            entityOwnershipGroupId: dto.entityOwnershipGroupId ?? undefined,
            active: true,
            permissionMode: dto.permissionMode,
            entityPermissions: dto.entityPermissions ?? [],
            expiresAt: dto.expiresAt ?? undefined,
        });

        this.logger.log(`API key created: ${doc._id} by user ${requestingUserId}`);

        return {
            key: this.toDTO(doc),
            rawKey,
        };
    }

    // ─── List ───────────────────────────────────────────────────────────────────

    async listByUser(userId: string): Promise<ApiKeyDTO[]> {
        const docs = await this.apiKeyModel
            .find({ userId })
            .sort({ createdAt: -1 })
            .lean()
            .exec();
        return docs.map((d) => this.toDTO(d));
    }

    async listByGroup(entityOwnershipGroupId: string): Promise<ApiKeyDTO[]> {
        const docs = await this.apiKeyModel
            .find({ entityOwnershipGroupId })
            .sort({ createdAt: -1 })
            .lean()
            .exec();
        return docs.map((d) => this.toDTO(d));
    }

    // ─── Revoke (soft-delete) ───────────────────────────────────────────────────

    async revoke(requestingUserId: string, keyId: string): Promise<void> {
        const doc = await this.apiKeyModel.findById(keyId).exec();
        await this.assertOwnership(doc, requestingUserId, keyId);
        await this.apiKeyModel.updateOne({ _id: keyId }, { active: false });
        this.logger.log(`API key revoked: ${keyId} by user ${requestingUserId}`);
    }

    // ─── Delete (hard-delete) ───────────────────────────────────────────────────

    async delete(requestingUserId: string, keyId: string): Promise<void> {
        const doc = await this.apiKeyModel.findById(keyId).exec();
        await this.assertOwnership(doc, requestingUserId, keyId);
        await this.apiKeyModel.deleteOne({ _id: keyId });
        this.logger.log(`API key deleted: ${keyId} by user ${requestingUserId}`);
    }

    // ─── Lookup by raw key (used by Passport strategy later) ───────────────────

    async findActiveByRawKey(rawKey: string): Promise<ApiKey | null> {
        const keyHash = this.hashKey(rawKey);
        const doc = await this.apiKeyModel
            .findOne({ keyHash, active: true })
            .exec();

        if (!doc) return null;

        if (doc.expiresAt && doc.expiresAt < new Date()) {
            return null;
        }

        this.updateLastUsedThrottled(doc);
        return doc;
    }

    // ─── Internal helpers ────────────────────────────────────────────────────────

    private generateRawKey(): string {
        // Format: umr_<40 hex chars>  (umr = users-mona-mr prefix)
        const bytes = crypto.randomBytes(20);
        return `umr_${bytes.toString('hex')}`;
    }

    private hashKey(rawKey: string): string {
        return crypto.createHash('sha256').update(rawKey).digest('hex');
    }


    private updateLastUsedThrottled(doc: { _id: any; lastUsedAt?: Date }): void {
        const now = new Date();
        if (
            !doc.lastUsedAt ||
            now.getTime() - doc.lastUsedAt.getTime() >
            ApiKeyService.LAST_USED_WRITE_THROTTLE_MS
        ) {
            this.apiKeyModel
                .updateOne({ _id: doc._id }, { lastUsedAt: now })
                .exec()
                .catch((err) =>
                    this.logger.warn(`Failed to update lastUsedAt for key ${doc._id}: ${err}`),
                );
        }
    }

    private toDTO(doc: any): ApiKeyDTO {
        return {
            id: doc._id?.toString(),
            name: doc.name,
            userId: doc.userId,
            entityOwnershipGroupId: doc.entityOwnershipGroupId,
            active: doc.active,
            permissionMode: doc.permissionMode,
            entityPermissions: doc.entityPermissions ?? [],
            expiresAt: doc.expiresAt,
            lastUsedAt: doc.lastUsedAt,
            createdAt: doc.createdAt,
        };
    }
}
