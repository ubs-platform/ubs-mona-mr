import { Document, Model } from 'mongoose';
import { QueryHelper } from '@ubs-platform/entity-base';
import { EntityOwnershipGroupInvitation } from '../entity/entity-ownership-group-invitation.schema';

export class EntityOwnerGroupInvitationQueryHelper extends QueryHelper<
    EntityOwnershipGroupInvitation | Document<EntityOwnershipGroupInvitation>
> {
    constructor(
        private eogInvitationModel: Model<EntityOwnershipGroupInvitation>,
    ) {
        super();
    }

    async delete(id: string): Promise<void> {
        await this.eogInvitationModel.findByIdAndDelete(id).exec();
    }

    async findById(id: string) {
        return await this.eogInvitationModel.findById(id).exec();
    }

    async save(
        entity:
            | EntityOwnershipGroupInvitation
            | Document<EntityOwnershipGroupInvitation>,
    ) {
        if (entity instanceof Document) {
            await entity.save();
            return entity.toObject() as EntityOwnershipGroupInvitation;
        }

        const saved = await this.eogInvitationModel
            .findByIdAndUpdate(
                (entity as EntityOwnershipGroupInvitation)._id,
                entity,
                { upsert: true, new: true },
            )
            .exec();

        return saved ? (saved.toObject() as EntityOwnershipGroupInvitation) : null;
    }

    searchParams(_searchAndPagination?: any) {
        return {};
    }
}
