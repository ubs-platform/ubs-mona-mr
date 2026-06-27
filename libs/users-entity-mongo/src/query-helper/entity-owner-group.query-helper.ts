import { Model } from "mongoose";
import { EntityOwnershipGroup } from "../entity/entity-ownership-group.schema";
import { EntityOwnershipGroupCommonDTO, EntityOwnershipGroupSearchDTO } from "libs/users-common/src/entity-ownership-group";
import { SearchRequest } from "@ubs-platform/crud-base-common";
import { QueryHelper } from "@ubs-platform/entity-base";
import { Document } from "mongoose";
export class EntityOwnerGroupQueryHelper extends QueryHelper<EntityOwnershipGroup | Document<EntityOwnershipGroup>> {

    constructor(private eogModel: Model<EntityOwnershipGroup>) {
        super();
    }

    async delete(id: string) {
        await this.eogModel.findByIdAndDelete(id).exec();
    }

    async findById(id: string) {
        return await this.eogModel.findById(id).exec();
    }

    async save(entity: EntityOwnershipGroup | Document<EntityOwnershipGroup>) {

        if (entity instanceof Document) {
            await entity.save();
            return entity.toObject() as EntityOwnershipGroup;
        }
        // return await entity.save();
        const saved = await this.eogModel.findByIdAndUpdate(entity._id, entity, { upsert: true }).exec();
        return saved ? saved.toObject() as EntityOwnershipGroup : null;
    }

    searchParams(
        searchAndPagination:
            | (EntityOwnershipGroupSearchDTO & SearchRequest)
            | undefined,
    ) {
        const s: any = {};
        if (searchAndPagination?.description) {
            s.description = {
                $regex: new RegExp(searchAndPagination.description, 'i'),
            };
        }
        if (searchAndPagination?.name) {
            s.name = {
                $regex: new RegExp(searchAndPagination.name, 'i'),
            };
        }
        if (searchAndPagination?.memberUserId) {
            s['userCapabilities.userId'] = searchAndPagination.memberUserId;
        }
        return s;
    }

    searchByUserId(
        userId: string,
        capacity: string | undefined,
    ): Promise<EntityOwnershipGroupCommonDTO[]> {
        // TODO: Mapperlar için entityler base class yazmak gerekiyor... 
        return this.eogModel
            .find({
                'userCapabilities.userId': userId,
                'userCapabilities.capability': capacity,
            })
            .exec()
            .then((entities) => entities.map((e) => this.mapper.toDto(e)));
    }
}