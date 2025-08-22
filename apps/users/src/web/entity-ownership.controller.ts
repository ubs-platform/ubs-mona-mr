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
    ) {}

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
    async hasOwnership(eo: EntityOwnershipUserCheck) {
        return this.cacheman.getOrCallAsync(
            `eo-hasOwnership ${eo.entityGroup} ${eo.entityId} ${eo.entityName} ${eo.userId}/${eo.capability}`,
            () => this.eoService.checkUser(eo),
            { livetime: 1000, livetimeExtending: 'ON_GET' },
        );
    }

    @MessagePattern(EOChannelConsts.searchOwnership)
    async searchOwnership(eo: EntityOwnershipSearch) {
        return this.cacheman.getOrCallAsync(
            `eo-searchOwnership ${eo.entityGroup} ${eo.entityId} ${eo.entityName}`,
            () => this.eoService.search(eo),
            { livetime: 1000, livetimeExtending: 'ON_GET' },
        );
    }

    @EventPattern(EOChannelConsts.deleteOwnership)
    async deleteOwnership(eo: EntityOwnershipSearch) {
        await this.eoService.deleteOwnership(eo);
        this.cacheman.invalidateRegex(/eo-*/);
    }

    @MessagePattern(EOChannelConsts.searchOwnershipUser)
    async searchOwnershipUser(eo: EntityOwnershipUserSearch) {
        return this.cacheman.getOrCallAsync(
            `eo-searchOwnershipUser ${eo.entityGroup} ${eo.entityName} ${eo.userId}  ${eo.capability} `,
            () => this.eoService.searchByUser(eo),
            { livetime: 1000, livetimeExtending: 'ON_GET' },
        );
    }
}
