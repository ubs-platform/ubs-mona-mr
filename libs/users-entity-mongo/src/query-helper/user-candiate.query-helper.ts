import { Model, Document } from 'mongoose';
import { QueryHelper } from '@ubs-platform/entity-base';
import { UserCandiate } from '../entity/user-candiate.model';

export class UserCandiateQueryHelper extends QueryHelper<UserCandiate | Document<UserCandiate>> {

    constructor(private userCandiateModel: Model<UserCandiate>) {
        super();
    }

    async delete(id: string): Promise<void> {
        await this.userCandiateModel.findByIdAndDelete(id).exec();
    }

    async findById(id: string) {
        return await this.userCandiateModel.findById(id).exec();
    }

    async save(entity: UserCandiate | Document<UserCandiate>) {
        if (entity instanceof Document) {
            await entity.save();
            return entity.toObject() as UserCandiate;
        }
        const saved = await this.userCandiateModel
            .findByIdAndUpdate((entity as UserCandiate)._id, entity, { upsert: true, new: true })
            .exec();
        return saved ? saved.toObject() as UserCandiate : null;
    }

    searchParams(_searchAndPagination?: any) {
        return {};
    }

    async deleteExpired() {
        await this.userCandiateModel
            .deleteMany({ expireDate: { $lt: new Date().toISOString() } })
            .exec();
    }

    async findByActivationKey(activationKey: string) {
        return await this.userCandiateModel.findOne({ activationKey }).exec();
    }

    async findByUsernameOrEmailExcludeId(
        username: string,
        primaryEmail: string,
        excludeId: any,
    ) {
        return await this.userCandiateModel
            .find({
                $or: [{ username }, { primaryEmail }],
                _id: { $ne: excludeId },
            })
            .exec();
    }
}
