import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Optional } from '@ubs-platform/crud-base-common/utils';
import { UserCapabilityDTO } from '@ubs-platform/users-common';
import { UserService } from '@ubs-platform/users-microservice-helper';
import { Model } from 'mongoose';
import { EntityOwnershipGroup } from '../domain/entity-ownership-group.schema';
import { EntityOwnershipGroupMapper } from '../mapper/entity-ownership-group.mapper';
import {
    EntityOwnershipGroupCreateDTO,
    EntityOwnershipGroupDTO,
    EOGUserCapabilityDTO,
} from 'libs/users-common/src/entity-ownership-group';

@Injectable()
export class EntityOwnershipGroupService {
    private readonly logger = new Logger(EntityOwnershipGroupService.name, {
        timestamp: true,
    });

    constructor(
        @InjectModel(EntityOwnershipGroup.name)
        private eogModel: Model<EntityOwnershipGroup>,
        private mapper: EntityOwnershipGroupMapper,
    ) {}

    async createGroup(
        eogDto: EntityOwnershipGroupCreateDTO,
    ): Promise<EntityOwnershipGroup> {
        this.logger.debug('EOG CREATE', eogDto.groupName);
        const entity = this.mapper.toEntity(eogDto);
        entity.userCapabilities.push({
            userId: eogDto.initialUserId,
            groupCapability: eogDto.initialUserGroupCapability || 'OWNER',
            capability: eogDto.initialUserEntityCapability,
        } as EOGUserCapabilityDTO);
        await entity.save();
        return entity;
    }

    async findGroupsUserIn(userId: string): Promise<EntityOwnershipGroupDTO[]> {
        return this.eogModel
            .find({ 'userCapabilities.userId': userId })
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
    ): Promise<void> {
        const group = await this.getById(groupId);
        if (!group) {
            throw new Error('EntityOwnershipGroup not found');
        }

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
            return;
        }

        group.userCapabilities = group.userCapabilities || [];
        group.userCapabilities.push(userCapability);
        await (group as any).save();
    }

    async removeUserCapability(
        groupId: string,
        userId: string,
        capability: string,
    ): Promise<void> {
        const group = await this.getById(groupId);
        if (!group) {
            throw new Error('EntityOwnershipGroup not found');
        }

        group.userCapabilities = group.userCapabilities?.filter(
            (uc) => !(uc.userId === userId && uc.capability === capability),
        );
        await (group as any).save();
    }
}
