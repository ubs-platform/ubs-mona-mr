import {
    Body,
    Controller,
    Delete,
    Get,
    Injectable,
    Param,
    Post,
    Put,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthLocalGuard } from '../guard/jwt-local.guard';
import {
    EntityOwnershipGroupCreateDTO,
    EntityOwnershipGroupDTO,
    EntityOwnershipGroupMetaDTO,
    EOGCheckUserGroupCapabilityDTO,
    EOGUserCapabilityDTO,
    EOGUserCapabilityInvitationDTO,
    EOGUserCapabilityInviteDTO,
    GroupCapability,
    UserAuthBackendDTO,
    UserCapabilityDTO,
} from '@ubs-platform/users-common';
import { EntityOwnershipGroupService } from '../services/entity-ownership-group.service';
import { CurrentUser } from '@ubs-platform/users-microservice-helper';

@Controller('entity-ownership-group')
export class EntityOwnershipGroupController {
    /**
     *
     */
    constructor(private eogService: EntityOwnershipGroupService) { }

    async assertHasUserGroupCapability(
        currentUser: UserAuthBackendDTO, groupId: string, requiredCapabilities: GroupCapability[]
    ) {
        if (currentUser.roles.includes('ADMIN')) {
            return;
        }
        const hasCap = await this.eogService.hasUserGroupCapability(
            { userId: currentUser.id, entityOwnershipGroupId: groupId, groupCapabilitiesAtLeastOne: requiredCapabilities }
        );
        if (!hasCap) {
            throw new UnauthorizedException(
                `User ${currentUser.id} does not have capability ${requiredCapabilities} in entity ownership group ${groupId}`,
            );
        }
    }

    @UseGuards(JwtAuthLocalGuard)
    @Post()
    async createEntityOwnershipGroup(
        @Body() eogCreate: EntityOwnershipGroupCreateDTO
    ) {
        // Only users with global admin role can create EOGs
        return await this.eogService.createGroup(eogCreate);
    }

    @UseGuards(JwtAuthLocalGuard)
    @Put()
    async editMeta(
        @Body() eogMetaDto: EntityOwnershipGroupMetaDTO,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        // Only users with global admin role can create EOGs
        this.assertHasUserGroupCapability(currentUser, eogMetaDto.id, ['OWNER', "EDITOR", "META_EDIT"]);

        return await this.eogService.editMeta(eogMetaDto);
    }


    @UseGuards(JwtAuthLocalGuard)
    @Delete(':id')
    async deleteEntityOwnershipGroup(
        @Param('id') id: string,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        // Only users with global admin role can delete EOGs
        this.assertHasUserGroupCapability(currentUser, id, ['OWNER']);

        return await this.eogService.deleteGroup(id);
    }
}
