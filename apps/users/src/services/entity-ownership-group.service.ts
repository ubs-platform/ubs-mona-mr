import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Optional } from '@ubs-platform/crud-base-common/utils';
import { Model } from 'mongoose';
import { EntityOwnershipGroup } from '../domain/entity-ownership-group.schema';
import { EntityOwnershipGroupMapper } from '../mapper/entity-ownership-group.mapper';
import {
    EntityOwnershipGroupCreateDTO,
    EntityOwnershipGroupDTO,
    EOGUserCapabilityDTO,
    GroupCapability,
} from 'libs/users-common/src/entity-ownership-group';
import { UserService } from './user.service';

@Injectable()
export class EntityOwnershipGroupService {
    private readonly logger = new Logger(EntityOwnershipGroupService.name, {
        timestamp: true,
    });

    constructor(
        @InjectModel(EntityOwnershipGroup.name)
        private eogModel: Model<EntityOwnershipGroup>,
        private mapper: EntityOwnershipGroupMapper,
        private userServiceLocal: UserService
    ) {}

    async fetchUsersInGroup(id: string): Promise<EOGUserCapabilityDTO[]> {
        const found = await this.eogModel.findById(id).exec();

        if (!found) {
            throw new Error('EntityOwnershipGroup not found');
        }

        return found.userCapabilities.map((a) => {
            return {
                userId: a.userId!,
                capability: a.capability,
                groupCapability: a.groupCapability,
                userFullName: a.userFullName,
            };
        });
    }

    async createGroup(
        eogDto: EntityOwnershipGroupCreateDTO,
    ): Promise<EntityOwnershipGroup> {
        this.logger.debug('EOG CREATE', eogDto.groupName);
        const entity = await this.mapper.toEntityCreate(eogDto);
        await entity.save();
        return this.mapper.toDto(entity);
    }

    async hasUserGroupCapability(
        entityOwnershipGroupId: string,
        currentUserId: string,
        groupCapabilitiesAtLeastOne: GroupCapability[],
    ): Promise<boolean> {
        const group = await this.getById(entityOwnershipGroupId);
        if (!group) {
            throw new Error('EntityOwnershipGroup not found');
        }

        return (
            group.userCapabilities?.some(
                (uc) =>
                    uc.userId === currentUserId &&
                    groupCapabilitiesAtLeastOne.includes(uc.groupCapability),
            ) || false
        );
    }

    async findGroupsUserIn(
        userIds: string[],
    ): Promise<EntityOwnershipGroupDTO[]> {
        return this.eogModel
            .find({ 'userCapabilities.userId': { $in: userIds } })
            .exec()
            .then((entities) => entities.map((e) => this.mapper.toDto(e)));
    }

    async getById(id: string): Promise<Optional<EntityOwnershipGroup>> {
        return this.eogModel.findById(id).exec();
    }

    searchByUserId(
        userId: string,
        capacity: string | undefined,
    ): Promise<EntityOwnershipGroupDTO[]> {
        return this.eogModel
            .find({
                'userCapabilities.userId': userId,
                'userCapabilities.capability': capacity,
            })
            .exec()
            .then((entities) => entities.map((e) => this.mapper.toDto(e)));
    }

    async addUserCapability(
        groupId: string,
        userCapability: EOGUserCapabilityDTO,
    ): Promise<EntityOwnershipGroupDTO> {
        const group = await this.getById(groupId);
        if (!group) {
            throw new Error('EntityOwnershipGroup not found');
        }

        const user = await this.userServiceLocal.findById(userCapability.userId);
        userCapability.userFullName = user?.name + ' ' + user?.surname;

        if (
            group.userCapabilities?.some(
                (uc) =>
                    uc.userId === userCapability.userId &&
                    uc.capability === userCapability.capability,
            )
        ) {
            this.logger.debug(
                'UserCapability already exists in group',
                groupId,
                userCapability,
            );
            return this.mapper.toDto(group);
        }

        group.userCapabilities = group.userCapabilities || [];
        group.userCapabilities.push(userCapability);
        await (group as any).save();
        return this.mapper.toDto(group);
    }

    async removeUserCapability(groupId: string, userId: string): Promise<void> {
        const group = await this.getById(groupId);
        if (!group) {
            throw new Error('EntityOwnershipGroup not found');
        }

        group.userCapabilities = group.userCapabilities?.filter(
            (uc) => !(uc.userId === userId),
        );
        await (group as any).save();
    }

    async updateUserCapability(
        groupId: string,
        userCapability: EOGUserCapabilityDTO,
    ): Promise<EntityOwnershipGroupDTO> {
        const group = await this.getById(groupId);
        if (!group) {
            throw new Error('EntityOwnershipGroup not found');
        }

        const index = group.userCapabilities?.findIndex(
            (uc) => uc.userId === userCapability.userId,
        );
        if (index === undefined || index < 0) {
            throw new Error('UserCapability not found in group');
        }

        group.userCapabilities[index].capability = userCapability.capability;
        group.userCapabilities[index].groupCapability =
            userCapability.groupCapability;
        await (group as any).save();
        return this.mapper.toDto(group);
    }
}
