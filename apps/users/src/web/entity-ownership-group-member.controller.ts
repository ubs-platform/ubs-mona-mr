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
export class EntityOwnershipGroupMemberController {
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
        await this.assertHasUserGroupCapability(
            currentUser,
            id,
            ['OWNER', 'ADJUST_MEMBERS', 'VIEWER'],
        );
        return await this.eogService.fetchUserCapabilityInvitations(id);
    }



    @UseGuards(JwtAuthLocalGuard)
    @Put(':id/capability')
    async updateUserCapability(
        @Param('id') id: string,
        @Body() body: EOGUserCapabilityDTO,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        await this.assertHasUserGroupCapability(
            currentUser,
            id,
            ['OWNER', 'ADJUST_MEMBERS', "ONLY_EDIT_MEMBER_CAPABILITIES"],
        );
        return await this.eogService.updateUserCapability(id, body);
    }

    @UseGuards(JwtAuthLocalGuard)
    @Delete(':id/capability/:userId')
    async removeUserFromEntityOwnership(
        @Param('id') id: string,
        @Param('userId') userId: string,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        await this.assertHasUserGroupCapability(
            currentUser,
            id,
            ['OWNER', 'ADJUST_MEMBERS'],
        );

        const people = await this.eogService.fetchUsersInGroup(id);
        if (people.length == 1) {
            throw new UnauthorizedException(
                `Member can't be removed as the only member.`,
            );
        }
        if ((people.find(a => a.userId == userId)?.groupCapability == "OWNER") && (people.filter(a => a.groupCapability == "OWNER").length < 2)) {
            throw new UnauthorizedException(
                `Owner can't leave Entity Ownership Group ${id} as the only owner.`,
            );
        }

        return await this.eogService.removeUserCapability(id, userId);
    }

    @UseGuards(JwtAuthLocalGuard)
    @Delete(':id/invitation/:invitationId')
    async removeUserFromEntityOwnershipInvitation(
        @Param('id') id: string,
        @Param('invitationId') invitationId: string,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {

        await this.assertHasUserGroupCapability(
            currentUser,
            id,
            ['OWNER', 'ADJUST_MEMBERS'],
        );

        return await this.eogService.removeInvitationAdmin(invitationId);
    }

    @UseGuards(JwtAuthLocalGuard)
    @Post(':id/invitation')
    async addUserToEntityOwnership(
        @Param('id') id: string,
        @Body() body: EOGUserCapabilityInviteDTO,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        await this.assertHasUserGroupCapability(
            currentUser,
            id,
            ['OWNER', 'ADJUST_MEMBERS'],
        );
        return await this.eogService.addUserCapabilityInvite(
            id,
            body,
            currentUser,
        );
    }
    t
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
