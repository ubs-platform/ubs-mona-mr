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

@Controller('entity-ownership')
export class EntityOwnershipController {
    constructor(private eoService: EntityOwnershipService) {}

    @EventPattern(EOChannelConsts.insertOwnership)
    async insertOwnership(oe: EntityOwnershipDTO) {
        console.info(oe);

        await this.eoService.insert(oe);
    }

    @EventPattern(EOChannelConsts.insertUserCapability)
    async insertUserCapability(oe: EntityOwnershipInsertCapabiltyDTO) {
        console.info(oe);

        await this.eoService.insertUserCapability(oe);
    }
    @MessagePattern(EOChannelConsts.checkOwnership)
    async hasOwnership(eo: EntityOwnershipUserCheck) {
        return await this.eoService.checkUser(eo);
    }

    @MessagePattern(EOChannelConsts.searchOwnership)
    async searchOwnership(eo: EntityOwnershipSearch) {
        return await this.eoService.search(eo);
    }

    @EventPattern(EOChannelConsts.deleteOwnership)
    async deleteOwnership(eo: EntityOwnershipSearch) {
        await this.eoService.deleteOwnership(eo);
    }

    @MessagePattern(EOChannelConsts.searchOwnershipUser)
    async searchOwnershipUser(eo: EntityOwnershipUserSearch) {
        return await this.eoService.searchByUser(eo);
    }
}
