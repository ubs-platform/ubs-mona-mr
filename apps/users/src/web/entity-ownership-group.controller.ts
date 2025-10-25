import {
    Body,
    Controller,
    Delete,
    Get,
    Injectable,
    Param,
    Post,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthLocalGuard } from '../guard/jwt-local.guard';
import {
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
    constructor(private eogService: EntityOwnershipGroupService) {}

    async assertHasUserGroupCapability(
        eogCheckCap: EOGCheckUserGroupCapabilityDTO,
    ) {
        const hasCap = await this.eogService.hasUserGroupCapability(
            eogCheckCap
        );
        debugger
        if (!hasCap) {
            throw new UnauthorizedException(
                `User ${eogCheckCap.userId} does not have capability ${eogCheckCap.groupCapabilitiesAtLeastOne} in entity ownership group ${eogCheckCap.entityOwnershipGroupId}`,
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
        await this.assertHasUserGroupCapability({
            entityOwnershipGroupId: id,
            userId: currentUser.id,
            groupCapabilitiesAtLeastOne: ['OWNER', 'ADJUST_MEMBERS', 'VIEWER'],
        });
        return await this.eogService.fetchUserCapabilityInvitations(id);
    }

    @UseGuards(JwtAuthLocalGuard)
    @Delete(':id/capability/:userId')
    async removeUserFromEntityOwnership(
        @Param('id') id: string,
        @Param('userId') userId: string,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        await this.assertHasUserGroupCapability({
            entityOwnershipGroupId: id,
            userId: currentUser.id,
            groupCapabilitiesAtLeastOne: ['OWNER', 'ADJUST_MEMBERS'],
        });

        return await this.eogService.removeUserCapability(id, userId);
    }

    @UseGuards(JwtAuthLocalGuard)
    @Delete(':id/invitation/:invitationId')
    async removeUserFromEntityOwnershipInvitation(
        @Param('id') id: string,
        @Param('invitationId') invitationId: string,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        await this.assertHasUserGroupCapability({
            entityOwnershipGroupId: id,
            userId: currentUser.id,
            groupCapabilitiesAtLeastOne: ['OWNER', 'ADJUST_MEMBERS'],
        });

        return await this.eogService.removeInvitationAdmin(invitationId);
    }

    @UseGuards(JwtAuthLocalGuard)
    @Post(':id/invitation')
    async addUserToEntityOwnership(
        @Param('id') id: string,
        @Body() body: EOGUserCapabilityInviteDTO,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        await this.assertHasUserGroupCapability({
            entityOwnershipGroupId: id,
            userId: currentUser.id,
            groupCapabilitiesAtLeastOne: ['OWNER', 'ADJUST_MEMBERS'],
        });
        return await this.eogService.addUserCapabilityInvite(
            id,
            body,
            currentUser,
        );
    }

    // Region: Invitation Acceptance for invited users

    @UseGuards(JwtAuthLocalGuard)
    @Delete('/invitation/:inviteId')
    async refuseInvitationCurrentUser(
        @Param('inviteId') inviteId: string,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        return await this.eogService.refuseUserCapabilityInvite(
            inviteId,
            currentUser,
        );
    }

    @UseGuards(JwtAuthLocalGuard)
    @Post('/invitation/:inviteId')
    async acceptDirectlyToEntityOwnership(
        @Param('inviteId') inviteId: string,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        return await this.eogService.addUserCapabilityAcceptInvite(
            inviteId,
            currentUser,
        );
    }

    @UseGuards(JwtAuthLocalGuard)
    @Get('invitation/_currentuser')
    async fetchMyInvitations(@CurrentUser() currentUser: UserAuthBackendDTO) {
        return await this.eogService.fetchCurrentUserInvitations(
            currentUser.id,
        );
    }
}
