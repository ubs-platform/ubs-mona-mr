import {
    Body,
    Controller,
    Delete,
    Get,
    Injectable,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthLocalGuard } from '../guard/jwt-local.guard';
import {
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
        entityOwnershipGroupId: string,
        currentUserId: string,
        groupCapabilitiesAtLeastOne: GroupCapability[],
    ) {
        const hasCap = await this.eogService.hasUserGroupCapability(
            entityOwnershipGroupId,
            currentUserId,
            groupCapabilitiesAtLeastOne,
        );
        if (!hasCap) {
            throw new Error(
                `User ${currentUserId} does not have capability ${groupCapabilitiesAtLeastOne} in entity ownership group ${entityOwnershipGroupId}`,
            );
        }
    }

    @Get(':id/users')
    async fetchUsersInGroup(
        @Param('id') id: string,
    ): Promise<EOGUserCapabilityDTO[]> {
        return await this.eogService.fetchUsersInGroup(id);
    }

    @UseGuards(JwtAuthLocalGuard)
    @Get(':id/invitation')
    async fetchUserCapabilityInvitations(
        @Param('id') id: string,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ): Promise<EOGUserCapabilityInvitationDTO[]> {
        await this.assertHasUserGroupCapability(id, currentUser.id, [
            'OWNER',
            'ADJUST_MEMBERS',
        ]);
        return await this.eogService.fetchUserCapabilityInvitations(id);
    }


    @UseGuards(JwtAuthLocalGuard)
    @Delete(':id/capability/:userId')
    async removeUserFromEntityOwnership(
        @Param('id') id: string,
        @Param('userId') userId: string,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        await this.assertHasUserGroupCapability(id, currentUser.id, [
            'OWNER',
            'ADJUST_MEMBERS',
        ]);

        return await this.eogService.removeUserCapability(id, userId);
    }


    @UseGuards(JwtAuthLocalGuard)
    @Delete(':id/invitation/:invitationId')
    async removeUserFromEntityOwnershipInvitation(
        @Param('id') id: string,
        @Param('invitationId') invitationId: string,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        
        await this.assertHasUserGroupCapability(id, currentUser.id, [
            'OWNER',
            'ADJUST_MEMBERS',
        ]);

        return await this.eogService.removeInvitation(invitationId);
    }



    @UseGuards(JwtAuthLocalGuard)
    @Post(':id/invitation')
    async addUserToEntityOwnership(
        @Param('id') id: string,
        @Body() body: EOGUserCapabilityInviteDTO,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        await this.assertHasUserGroupCapability(id, currentUser.id, [
            'OWNER',
            'ADJUST_MEMBERS',
        ]);
        return await this.eogService.addUserCapabilityInvite(
            id,
            body,
            currentUser,
        );
    }

    @UseGuards(JwtAuthLocalGuard)
    @Post(':id/invitation/:inviteId')
    async acceptDirectlyToEntityOwnership(
        @Param('id') id: string,
        @Param('inviteId') inviteId: string,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        return await this.eogService.addUserCapabilityAcceptInvite(id,
            inviteId,
            currentUser,
        );
    }
}
