import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityOwnershipGroup } from '../domain/entity-ownership-group.schema';
import {
    EntityOwnershipGroupCommonDTO,
    EntityOwnershipGroupDTO,
} from '@ubs-platform/users-common';
import { UserService } from '../services/user.service';

@Injectable()
export class EntityOwnershipGroupMapper {
    constructor(
        @InjectModel(EntityOwnershipGroup.name)
        private eogModel: Model<EntityOwnershipGroup>,
        private userServiceLocal: UserService,
    ) {}

    async toEntityCreate(
        eogDto: EntityOwnershipGroupCommonDTO,
        currentUserId: string,
    ) {
        const user = await this.userServiceLocal.findById(currentUserId);
        return new this.eogModel({
            name: eogDto.name,
            description: eogDto.description,
            userCapabilities: [
                {
                    userId: currentUserId,
                    userFullName: user?.name + ' ' + user?.surname,
                    entityCapabilities: eogDto.initialUserEntityCapabilities,
                    groupCapability: 'OWNER',
                },
            ],
        });
    }

    async editExisting(
        existing: EntityOwnershipGroup,
        eogDto: EntityOwnershipGroupDTO,
    ) {
        existing.name = eogDto.name;
        existing.description = eogDto.description;

        return existing;
    }

    toDto(eog: EntityOwnershipGroup) {
        return {
            id: eog._id.toString(),
            name: eog.name,
            description: eog.description,
            // userCapabilities: eog.userCapabilities.map((a) => ({
            //     userId: a.userId,
            //     entityCapabilities: a.entityCapabilities,
            //     groupCapability: a.groupCapability,
            //     userFullName: a.userFullName,
            // })),
        } as EntityOwnershipGroupCommonDTO;
    }
}
