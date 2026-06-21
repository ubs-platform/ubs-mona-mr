import { Model, Document } from 'mongoose';
import { QueryHelper } from '@ubs-platform/entity-base';
import { EntityOwnership } from '../entity/entity-ownership.schema';
import {
    EntityOwnershipInsertCapabiltyDTO,
    EntityOwnershipSearch,
    EntityOwnershipUserSearch,
} from 'libs/users-common/src/entity-ownership-dto';

export class EntityOwnershipQueryHelper extends QueryHelper<EntityOwnership | Document<EntityOwnership>> {

    constructor(private eoModel: Model<EntityOwnership>) {
        super();
    }

    async delete(id: string): Promise<void> {
        await this.eoModel.findByIdAndDelete(id).exec();
    }

    async findById(id: string) {
        return await this.eoModel.findById(id).exec();
    }

    async save(entity: EntityOwnership | Document<EntityOwnership>) {
        if (entity instanceof Document) {
            await entity.save();
            return entity.toObject() as EntityOwnership;
        }
        const saved = await this.eoModel
            .findByIdAndUpdate((entity as EntityOwnership)._id, entity, { upsert: true, new: true })
            .exec();
        return saved ? saved.toObject() as EntityOwnership : null;
    }

    searchParams(searchAndPagination: EntityOwnershipSearch | undefined) {
        const s: any = {};
        if (searchAndPagination?.entityGroup) {
            s.entityGroup = searchAndPagination.entityGroup;
        }
        if (searchAndPagination?.entityName) {
            s.entityName = searchAndPagination.entityName;
        }
        if (searchAndPagination?.entityId) {
            s.entityId = searchAndPagination.entityId;
        }
        return s;
    }

    async findBySearchKeys(searchKeys: EntityOwnershipSearch) {
        return await this.eoModel
            .find({
                ...(searchKeys.entityId ? { entityId: searchKeys.entityId } : {}),
                entityGroup: searchKeys.entityGroup,
                entityName: searchKeys.entityName,
            })
            .exec();
    }

    async deleteOne(searchKeys: EntityOwnershipSearch) {
        await this.eoModel.deleteOne(searchKeys).exec();
    }

    async pullUserCapability(searchKeys: EntityOwnershipSearch, userId: string) {
        return await this.eoModel
            .updateOne(searchKeys, { $pull: { userCapabilities: { userId } } })
            .exec();
    }

    async updateUserCapability(
        searchKeys: EntityOwnershipSearch,
        oe: EntityOwnershipInsertCapabiltyDTO,
    ) {
        return await this.eoModel
            .updateOne(
                { ...searchKeys, 'userCapabilities.userId': oe.userId },
                { $set: { 'userCapabilities.$[related].capability': oe.capability } },
                { arrayFilters: [{ 'related.userId': oe.userId }] },
            )
            .exec();
    }

    async findByUserSearch(eo: EntityOwnershipUserSearch) {
        return await this.eoModel
            .find({
                entityGroup: eo.entityGroup,
                entityName: eo.entityName,
                ...(eo.userId
                    ? {
                        userCapabilities: {
                            $elemMatch: {
                                userId: eo.userId,
                                ...(eo.capabilityAtLeastOne?.length
                                    ? { capability: { $in: eo.capabilityAtLeastOne } }
                                    : {}),
                            },
                        },
                    }
                    : {}),
                ...(eo.entityOwnershipGroupId
                    ? { entityOwnershipGroupId: eo.entityOwnershipGroupId }
                    : {}),
            })
            .exec();
    }

    async findByEogId(eogId: string) {
        return await this.eoModel.find({ entityOwnershipGroupId: eogId }).exec();
    }

    async findByEogIdAndEntityDetails(
        entityGroup: string,
        entityName: string,
        entityOwnershipGroupId: string,
    ) {
        return await this.eoModel
            .find({
                entityGroup,
                entityName,
                entityId: { $ne: null },
                entityOwnershipGroupId,
            })
            .exec();
    }
}
