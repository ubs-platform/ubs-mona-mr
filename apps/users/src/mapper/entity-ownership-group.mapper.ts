import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { EntityOwnershipGroup } from "../domain/entity-ownership-group.schema";
import { EntityOwnershipGroupCreateDTO, EntityOwnershipGroupDTO } from "libs/users-common/src/entity-ownership-group";
import { UserService } from "../services/user.service";

@Injectable()
export class EntityOwnershipGroupMapper {

    constructor(
        @InjectModel(EntityOwnershipGroup.name)
        private eogModel: Model<EntityOwnershipGroup>,
        private userService: UserService,
    ) { }

    toEntityCreate(eogDto: EntityOwnershipGroupCreateDTO) {
        return new this.eogModel({
            groupName: eogDto.groupName,
            description: eogDto.description,
            userCapabilities: [
                {
                    userId: eogDto.initialUserId,
                    capability: eogDto.initialUserEntityCapability,
                    groupCapability: eogDto.initialUserGroupCapability || 'OWNER',
                }
            ]
        });
    }

    toEntity(eogDto: EntityOwnershipGroupDTO) {
        return new this.eogModel({
            _id: eogDto.id,
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