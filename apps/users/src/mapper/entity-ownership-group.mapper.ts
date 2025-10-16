import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityOwnershipGroup } from '../domain/entity-ownership-group.schema';
import {
    EntityOwnershipGroupCreateDTO,
    EntityOwnershipGroupDTO,
} from 'libs/users-common/src/entity-ownership-group';
import { UserService } from '../services/user.service';

@Injectable()
export class EntityOwnershipGroupMapper {
    constructor(
        @InjectModel(EntityOwnershipGroup.name)
        private eogModel: Model<EntityOwnershipGroup>,
        private userServiceLocal: UserService,
    ) {}

    async toEntityCreate(eogDto: EntityOwnershipGroupCreateDTO) {
        const user = await this.userServiceLocal.findById(eogDto.initialUserId);
        return new this.eogModel({
            groupName: eogDto.groupName,
            description: eogDto.description,
            userCapabilities: [
                {
                    userId: eogDto.initialUserId,
                    userFullName: user?.name + ' ' + user?.surname,
                    capability: eogDto.initialUserEntityCapability,
                    groupCapability:
                        eogDto.initialUserGroupCapability || 'OWNER',
                },
            ],
        });
    }

    // async toEntity(eogDto: EntityOwnershipGroupDTO) {
    //     return new this.eogModel({
    //         _id: eogDto.id,
    //         groupName: eogDto.groupName,
    //         description: eogDto.description,
    //         userCapabilities: eogDto.userCapabilities.map((a) => ({
    //             userId: a.userId,
    //             capability: a.capability,
    //             userFullName: a.userFullName,
    //             groupCapability: a.groupCapability,
    //         })),
    //     });
    // }

    toDto(eog: EntityOwnershipGroup) {
        return {
            id: eog._id.toString(),
            groupName: eog.groupName,
            description: eog.description,
            userCapabilities: eog.userCapabilities.map((a) => ({
                userId: a.userId,
                capability: a.capability,
                groupCapability: a.groupCapability,
                userFullName: a.userFullName,
            })),
        } as EntityOwnershipGroupDTO;
    }
}
