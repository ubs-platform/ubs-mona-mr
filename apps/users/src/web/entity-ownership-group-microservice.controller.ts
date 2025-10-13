import { Controller } from '@nestjs/common';
import { EntityOwnershipService } from '../services/entity-ownership.service';
import { EventPattern, MessagePattern } from '@nestjs/microservices';
import {
    EntityOwnershipDTO,
    EntityOwnershipInsertCapabiltyDTO,
    EntityOwnershipSearch,
    EntityOwnershipUserCheck,
    EntityOwnershipUserSearch,
} from '@ubs-platform/users-common';
import { EOChannelConsts, EOGroupEventConsts } from '@ubs-platform/users-consts';
import { CacheManagerService } from '@ubs-platform/cache-manager';
import { EntityOwnershipGroupService } from '../services/entity-ownership-group.service';
import { EntityOwnershipGroupCreateDTO, EntityOwnershipGroupDTO } from 'libs/users-common/src/entity-ownership-group';

@Controller('entity-ownership-group')
export class EntityOwnershipGroupMicroserviceController {
    constructor(
        private eogService: EntityOwnershipGroupService,
        private cacheman: CacheManagerService,
    ) { }

    @EventPattern(EOGroupEventConsts.getByUserIds)
    async getByUserIds(userIds: string[]): Promise<EntityOwnershipGroupDTO[]> {
        return await this.eogService.findGroupsUserIn(userIds);
    }

    @EventPattern(EOGroupEventConsts.createGroup)
    async insertOwnershipGroup(eog: EntityOwnershipGroupCreateDTO) {
        this.cacheman.invalidateRegex(/eog-*/);
        return await this.eogService.createGroup(eog);
    }

    @EventPattern(EOGroupEventConsts.addUserCapability)
    async addUserCapability(data: { groupId: string, userCapability: any }) {
        this.cacheman.invalidateRegex(/eog-*/);
        return await this.eogService.addUserCapability(data.groupId, data.userCapability);
    }

    @EventPattern(EOGroupEventConsts.removeUserCapability)
    async removeUserCapability(data: { groupId: string, userId: string, capability: string }) {
        this.cacheman.invalidateRegex(/eog-*/);
        return await this.eogService.removeUserCapability(data.groupId, data.userId, data.capability);
    }

    @MessagePattern(EOGroupEventConsts.getById)
    async getById(id: string) {
        return this.cacheman.getOrCallAsync(
            `eog-getById ${id}`,
            () => this.eogService.getById(id),
            { livetime: 1000, livetimeExtending: 'ON_GET' },
        );
    }

    @MessagePattern(EOGroupEventConsts.searchByUserId)
    async searchByUserId(searchParams: { userId: string, capacity?: string }): Promise<EntityOwnershipGroupDTO[]> {
        return this.cacheman.getOrCallAsync(
            `eog-searchByUserId ${searchParams.userId}`,
            () => this.eogService.searchByUserId(searchParams.userId, searchParams.capacity),
            { livetime: 1000, livetimeExtending: 'ON_GET' },
        );
    }

}
