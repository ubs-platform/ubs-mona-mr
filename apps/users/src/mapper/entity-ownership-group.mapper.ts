import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { EntityOwnershipGroup } from "../domain/entity-ownership-group.schema";
import { EntityOwnershipGroupDTO } from "libs/users-common/src/entity-ownership-group";

@Injectable()
export class EntityOwnershipGroupMapper {

    constructor(
        @InjectModel(EntityOwnershipGroup.name)
        private eogModel: Model<EntityOwnershipGroup>,
    ) { }

    toEntity(eogDto: EntityOwnershipGroupDTO) {
        return new this.eogModel({
            groupName: eogDto.groupName,
            description: eogDto.description,
            userCapabilities: eogDto.userCapabilities.map((a) => ({
                userId: a.userId,
                capability: a.capability,
            })),
        });
    }

    toDto(eog: EntityOwnershipGroup) {
        return {
            id: eog._id.toString(),
            groupName: eog.groupName,
            description: eog.description,
            userCapabilities: eog.userCapabilities.map((a) => ({
                userId: a.userId,
                capability: a.capability,
                groupCapability: a.groupCapability,
            })),
        } as EntityOwnershipGroupDTO;
    }
}