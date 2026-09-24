import { Controller } from '@nestjs/common';
import { EntityOwnershipService } from '../services/entity-ownership.service';
import { MessagePattern } from '@nestjs/microservices';
import { LegacyEventPattern } from '@ubs-platform/microservice-setup-util';
import {
    EntityOwnershipDTO,
    EntityOwnershipInsertCapabiltyDTO,
    EntityOwnershipSearch,
    EntityOwnershipUserCheck,
    EntityOwnershipUserSearch,
    EntityOwnershipGroupMetaDTO,
} from '@ubs-platform/users-common';
import {
    EOChannelConsts,
    EOGroupEventConsts,
} from '@ubs-platform/users-consts';
import { CacheManagerService } from '@ubs-platform/cache-manager';
import { EntityOwnershipGroupService } from '../services/entity-ownership-group.service';
import {
    EntityOwnershipGroupCommonDTO,
    EntityOwnershipGroupDTO,
    EOGCheckUserGroupCapabilityDTO,
    EOGUserCapabilityDTO,
} from 'libs/users-common/src/entity-ownership-group';
import e from 'express';

@Controller('entity-ownership-group')
export class EntityOwnershipGroupMicroserviceController {
    constructor(
        private eogService: EntityOwnershipGroupService,
        private cacheman: CacheManagerService,
    ) {}

    @LegacyEventPattern(EOGroupEventConsts.getByUserIds)
    async getByUserIds(userIds: string[]): Promise<EntityOwnershipGroupCommonDTO[]> {
        return await this.eogService.findGroupsUserIn(userIds);
    }

    @LegacyEventPattern(EOGroupEventConsts.fetchMembers)
    async fetchMembers(
        groupId: string,
    ): Promise<EOGUserCapabilityDTO[]> {
        return await this.eogService.fetchUsersInGroup(groupId);
    }
    
    @LegacyEventPattern(EOGroupEventConsts.createGroup)
    async insertOwnershipGroup(eog: EntityOwnershipGroupCommonDTO) {
        this.cacheman.invalidateRegex(/eog-*/);
        return await this.eogService.createGroup(eog, eog.initialUserId!);
    }

    @LegacyEventPattern(EOGroupEventConsts.addUserCapability)
    async addUserCapability(data: { groupId: string; userCapability: any }) {
        this.cacheman.invalidateRegex(/eog-*/);
        return await this.eogService.addUserCapability(
            data.groupId,
            data.userCapability,
        );
    }

    @LegacyEventPattern(EOGroupEventConsts.removeUserCapability)
    async removeUserCapability(data: {
        groupId: string;
        userId: string;
    }) {
        this.cacheman.invalidateRegex(/eog-*/);
        return await this.eogService.removeUserCapability(
            data.groupId,
            data.userId,
        );
    }

    @LegacyEventPattern(EOGroupEventConsts.checkUserCapability)
    async checkUserCapability(data: EOGCheckUserGroupCapabilityDTO) {
        return await this.eogService.hasUserGroupCapability(
            data
        );
    }

    @MessagePattern(EOGroupEventConsts.getById)
    async getById(id: string) {
        return this.cacheman.getOrCallAsync(
            `eog-getById ${id}`,
            () => this.eogService.getById(id),
            { livetime: 1000, livetimeExtending: 'ON_GET' },
        );
    }

    @MessagePattern(EOGroupEventConsts.editMeta)
    async editMeta(data: EntityOwnershipGroupMetaDTO) {
        this.cacheman.invalidateRegex(/eog-*/);
        return await this.eogService.editMeta(data);
    }

    @MessagePattern(EOGroupEventConsts.searchByUserId)
    async searchByUserId(searchParams: {
        userId: string;
        requestedCapabilities?: number[][];
    }): Promise<EntityOwnershipGroupCommonDTO[]> {
        return this.cacheman.getOrCallAsync(
            `eog-searchByUserId ${searchParams.userId}`,
            () =>
                this.eogService.searchByUserId(
                    searchParams.userId,
                    searchParams.requestedCapabilities,
                ),
            { livetime: 1000, livetimeExtending: 'ON_GET' },
        );
    }
}
