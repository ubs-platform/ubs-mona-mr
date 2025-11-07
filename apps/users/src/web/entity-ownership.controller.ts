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
import { EOChannelConsts } from '@ubs-platform/users-consts';
import { CacheManagerService } from '@ubs-platform/cache-manager';

@Controller('entity-ownership')
export class EntityOwnershipController {
    constructor(
        private eoService: EntityOwnershipService,
        private cacheman: CacheManagerService,
    ) { }

    

    @EventPattern(EOChannelConsts.editOwnership)
    async editOwnership(oe: EntityOwnershipDTO) {
        await this.eoService.edit(oe);
        this.cacheman.invalidateRegex(/eo-*/);
    }

    @EventPattern(EOChannelConsts.insertOwnership)
    async insertOwnership(oe: EntityOwnershipDTO) {
        await this.eoService.insert(oe);
        this.cacheman.invalidateRegex(/eo-*/);
    }

    @EventPattern(EOChannelConsts.insertUserCapability)
    async insertUserCapability(oe: EntityOwnershipInsertCapabiltyDTO) {
        console.info(oe);

        await this.eoService.insertUserCapability(oe);
        this.cacheman.invalidateRegex(/eo-*/);
    }

    @MessagePattern(EOChannelConsts.checkOwnership)
    async hasOwnershipDetailed(eo: EntityOwnershipUserCheck) {
        this.validateOwnershipParameters(eo);
        return this.cacheman.getOrCallAsync(
            `eo-hasOwnershipDetailed ${eo.entityGroup} ${eo.entityId} ${eo.entityName} ${eo.userId}/${eo.entityOwnershipGroupId}/${eo.capabilityAtLeastOne?.join(",")}`,
            () => this.eoService.findInsertedUserCapability(eo, true),
            { livetime: 1000, livetimeExtending: 'ON_GET' },
        );
    }

    @MessagePattern(EOChannelConsts.removeOwnershipUserCapability)
    async removeOwnershipUserCapability(eo: EntityOwnershipUserCheck) {
        this.validateOwnershipParametersOnlyUserId(eo);
        await this.eoService.removeUserCapability(eo);
        this.cacheman.invalidateRegex(/eo-*/);
    }

    // @MessagePattern(EOChannelConsts.checkOwnership)
    // async hasOwnershipOfOne(eo: EntityOwnershipUserCheck) {
    //     return ((await this.hasOwnershipDetailed(eo)) != null);
    // }
    private validateOwnershipParametersOnlyUserId(eo: EntityOwnershipUserCheck | EntityOwnershipUserSearch) {
        if (!eo.userId) {
            throw new Error('userId must be provided.');
        }
    }


    private validateOwnershipParameters(eo: EntityOwnershipUserCheck | EntityOwnershipUserSearch) {
        if (!eo.userId && !eo.entityOwnershipGroupId) {
            throw new Error('At least one of userId or entityOwnershipGroupId must be provided.');
        }
    }

    @MessagePattern(EOChannelConsts.searchOwnership)
    async searchOwnership(eo: EntityOwnershipSearch) {
        const a = await this.cacheman.getOrCallAsync(
            `eo-searchOwnership ${eo.entityGroup} ${eo.entityId} ${eo.entityName}`,
            () => this.eoService.search(eo),
            { livetime: 1000, livetimeExtending: 'ON_GET' },
        );
        return a;
    }

    @EventPattern(EOChannelConsts.deleteOwnership)
    async deleteOwnership(eo: EntityOwnershipSearch) {
        await this.eoService.deleteOwnership(eo);
        this.cacheman.invalidateRegex(/eo-*/);
    }

    @MessagePattern(EOChannelConsts.searchOwnershipUser)
    async searchOwnershipUser(eo: EntityOwnershipUserSearch) {
        return this.cacheman.getOrCallAsync(
            `eo-searchOwnershipUser ${eo.entityGroup} ${eo.entityName} ${eo.userId}  ${eo.capabilityAtLeastOne?.join(",")} `,
            () => this.eoService.searchByUser(eo),
            { livetime: 1000, livetimeExtending: 'ON_GET' },
        );
    }

    @MessagePattern(EOChannelConsts.searchEntityIdsByUser)
    async searchEntityIdsByUser(eo: EntityOwnershipUserSearch) {
        return this.cacheman.getOrCallAsync(
            `eo-searchEntityIdsByUser ${eo.entityGroup} ${eo.entityName} ${eo.userId}  ${eo.capabilityAtLeastOne?.join(",")} `,
            () => this.eoService.searchEntityIdsByUser(eo),
            { livetime: 1000, livetimeExtending: 'ON_GET' },
        );
    }
}
