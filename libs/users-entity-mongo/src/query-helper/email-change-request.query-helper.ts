import { Model, Document } from 'mongoose';
import { QueryHelper } from '@ubs-platform/entity-base';
import { EmailChangeRequest } from '../entity/email-change-request.schema';

export class EmailChangeRequestQueryHelper extends QueryHelper<EmailChangeRequest | Document<EmailChangeRequest>> {

    constructor(private echReqModel: Model<EmailChangeRequest>) {
        super();
    }

    async delete(id: string): Promise<void> {
        await this.echReqModel.findByIdAndDelete(id).exec();
    }

    async findById(id: string) {
        return await this.echReqModel.findById(id).exec();
    }

    async save(entity: EmailChangeRequest | Document<EmailChangeRequest>) {
        if (entity instanceof Document) {
            await entity.save();
            return entity.toObject() as EmailChangeRequest;
        }
        const saved = await this.echReqModel
            .findByIdAndUpdate((entity as EmailChangeRequest)._id, entity, { upsert: true, new: true })
            .exec();
        return saved ? saved.toObject() as EmailChangeRequest : null;
    }

    searchParams(_searchAndPagination?: any) {
        return {};
    }

    async deleteExpired() {
        await this.echReqModel
            .deleteMany({ expireAfter: { $lt: new Date().toISOString() } })
            .exec();
    }

    async findByIdAndUserId(id: string, userId: string) {
        return await this.echReqModel
            .findOne({ _id: id, userId })
            .exec();
    }

    async deleteExpiredBefore(date: Date) {
        await this.echReqModel
            .deleteMany({ expireAfter: { $lt: date } })
            .exec();
    }
}
