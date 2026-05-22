import { Injectable } from '@nestjs/common';
import { EntityOwnershipGroup } from '@ubs-platform/users-entity-mongo';
import {
    EntityOwnershipGroupCommonDTO,
    EntityOwnershipGroupDTO,
} from '@ubs-platform/users-common';
import { UserService } from '../services/user.service';

@Injectable()
export class EntityOwnershipGroupMapper {
    constructor(
        private userServiceLocal: UserService,
    ) {}

    async toEntityCreate(
        eogDto: EntityOwnershipGroupCommonDTO,
        currentUserId: string,
    ) {
        const user = await this.userServiceLocal.findById(currentUserId);
        return {
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
        } as any;
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
            id: (eog.id || eog._id).toString(),
            name: eog.name,
            description: eog.description,
        } as EntityOwnershipGroupCommonDTO;
    }
}
