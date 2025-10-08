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

    @EventPattern(EOGroupEventConsts.createGroup)
    async insertOwnershipGroup(eog: EntityOwnershipGroupCreateDTO) {
        await this.eogService.createGroup(eog);
        this.cacheman.invalidateRegex(/eog-*/);
    }

    @EventPattern(EOGroupEventConsts.addUserCapability)
    async addUserCapability(data: { groupId: string, userCapability: any }) {
        await this.eogService.addUserCapability(data.groupId, data.userCapability);
        this.cacheman.invalidateRegex(/eog-*/);
    }

    @EventPattern(EOGroupEventConsts.removeUserCapability)
    async removeUserCapability(data: { groupId: string, userId: string, capability: string }) {
        await this.eogService.removeUserCapability(data.groupId, data.userId, data.capability);
        this.cacheman.invalidateRegex(/eog-*/);
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
    async searchByUserId(searchParams: {userId: string, capacity?:string}): Promise<EntityOwnershipGroupDTO[]> {
        return this.cacheman.getOrCallAsync(
            `eog-searchByUserId ${searchParams.userId}`,
            () => this.eogService.searchByUserId(searchParams.userId, searchParams.capacity),
            { livetime: 1000, livetimeExtending: 'ON_GET' },
        );
    }

    // @EventPattern(EOChannelConsts.insertOwnership)
    // async insertOwnership(oe: EntityOwnershipDTO) {
    //     await this.eoService.insert(oe);
    //     this.cacheman.invalidateRegex(/eo-*/);
    // }

    // @EventPattern(EOChannelConsts.insertUserCapability)
    // async insertUserCapability(oe: EntityOwnershipInsertCapabiltyDTO) {
    //     console.info(oe);

    //     await this.eoService.insertUserCapability(oe);
    //     this.cacheman.invalidateRegex(/eo-*/);
    // }

    // @MessagePattern(EOChannelConsts.checkOwnership)
    // async hasOwnershipDetailed(eo: EntityOwnershipUserCheck) {
    //     this.validateOwnershipParameters(eo);
    //     return this.cacheman.getOrCallAsync(
    //         `eo-hasOwnershipDetailed ${eo.entityGroup} ${eo.entityId} ${eo.entityName} ${eo.userId}/${eo.entityOwnershipGroupId}/${eo.capability}`,
    //         () => this.eoService.findInsertedUserCapability(eo, true),
    //         { livetime: 1000, livetimeExtending: 'ON_GET' },
    //     );
    // }

    // // @MessagePattern(EOChannelConsts.checkOwnership)
    // // async hasOwnershipOfOne(eo: EntityOwnershipUserCheck) {
    // //     return ((await this.hasOwnershipDetailed(eo)) != null);
    // // }

    // private validateOwnershipParameters(eo: EntityOwnershipUserCheck | EntityOwnershipUserSearch) {
    //     if (!eo.userId && !eo.entityOwnershipGroupId) {
    //         throw new Error('At least one of userId or entityOwnershipGroupId must be provided.');
    //     }
    // }

    // @MessagePattern(EOChannelConsts.searchOwnership)
    // async searchOwnership(eo: EntityOwnershipSearch) {
    //     return this.cacheman.getOrCallAsync(
    //         `eo-searchOwnership ${eo.entityGroup} ${eo.entityId} ${eo.entityName}`,
    //         () => this.eoService.search(eo),
    //         { livetime: 1000, livetimeExtending: 'ON_GET' },
    //     );
    // }

    // @EventPattern(EOChannelConsts.deleteOwnership)
    // async deleteOwnership(eo: EntityOwnershipSearch) {
    //     await this.eoService.deleteOwnership(eo);
    //     this.cacheman.invalidateRegex(/eo-*/);
    // }

    // @MessagePattern(EOChannelConsts.searchOwnershipUser)
    // async searchOwnershipUser(eo: EntityOwnershipUserSearch) {
    //     return this.cacheman.getOrCallAsync(
    //         `eo-searchOwnershipUser ${eo.entityGroup} ${eo.entityName} ${eo.userId}  ${eo.capabilityAtLeastOne?.join(",")} `,
    //         () => this.eoService.searchByUser(eo),
    //         { livetime: 1000, livetimeExtending: 'ON_GET' },
    //     );
    // }
}
