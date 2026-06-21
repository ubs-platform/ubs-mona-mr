import { Model, Document } from 'mongoose';
import { QueryHelper } from '@ubs-platform/entity-base';
import { PwResetRequest } from '../entity/pw-reset-request.schema';

export class PwResetRequestQueryHelper extends QueryHelper<PwResetRequest | Document<PwResetRequest>> {

    constructor(private pwResetModel: Model<PwResetRequest>) {
        super();
    }

    async delete(id: string): Promise<void> {
        await this.pwResetModel.findByIdAndDelete(id).exec();
    }

    async findById(id: string) {
        return await this.pwResetModel.findById(id).exec();
    }

    async save(entity: PwResetRequest | Document<PwResetRequest>) {
        if (entity instanceof Document) {
            await entity.save();
            return entity.toObject() as PwResetRequest;
        }
        const saved = await this.pwResetModel
            .findByIdAndUpdate((entity as PwResetRequest)._id, entity, { upsert: true, new: true })
            .exec();
        return saved ? saved.toObject() as PwResetRequest : null;
    }

    searchParams(_searchAndPagination?: any) {
        return {};
    }

    async countValid(id: any) {
        return await this.pwResetModel
            .countDocuments({ _id: id, expireAfter: { $gt: new Date() } })
            .exec();
    }

    async deleteExpiredAndByUserId(userId: string | null) {
        const orClauses: any[] = [{ expireAfter: { $lt: new Date() } }];
        if (userId) {
            orClauses.push({ userId });
        }
        await this.pwResetModel
            .deleteMany({ $or: orClauses.filter(Boolean) })
            .exec();
    }

    async findValidById(id: any) {
        return await this.pwResetModel
            .findOne({ _id: id, expireAfter: { $gt: new Date() } })
            .exec();
    }

    async deleteById(id: any) {
        await this.pwResetModel.deleteOne({ _id: id }).exec();
    }

    async deleteExpired() {
        await this.pwResetModel
            .deleteMany({ expireAfter: { $lt: new Date().toISOString() } })
            .exec();
    }
}
