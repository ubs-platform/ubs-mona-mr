import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EntityOwnershipGroupService } from '../services/entity-ownership-group.service';
import { UserAuthBackendDTO, EOGUserEntityCapabilityDTO, requestedCapabilitiesToString, Capability } from '@ubs-platform/users-common';
import { exec } from 'child_process';

@Injectable()
export class EogAssertions {
    constructor(
        private eogService: EntityOwnershipGroupService
    ) { }

    async assertHasUserGroupCapability(
        currentUser: UserAuthBackendDTO, groupId: string, requiredCapabilities: number[][]
    ) {
        if (currentUser.roles.includes('ADMIN')) {
            return;
        }
        const hasCap = await this.eogService.hasUserGroupCapability(
            { userId: currentUser.id, entityOwnershipGroupId: groupId, requestedCapabilities: requiredCapabilities }
        );
        if (!hasCap) {
            throw new UnauthorizedException(
                `User ${currentUser.id} does not have capability ${requestedCapabilitiesToString(requiredCapabilities)} in entity ownership group ${groupId}`,
            );
        }
    }

    async assertUserDontChangeGroupOwnerCapabilities(
        currentUser: UserAuthBackendDTO, groupId: string,
        changingUserId: string
    ) {
        if (currentUser.roles.includes('ADMIN')) {
            return;
        }
        const eog = await this.eogService.getById(groupId);
        if (!eog) {
            throw new UnauthorizedException(
                `Entity Ownership Group ${groupId} not found`,
            );
        }
        const currentUserCapabilities = eog.userCapabilities.find(a => a.userId === currentUser.id);
        if (!currentUserCapabilities) {
            throw new UnauthorizedException(
                `User ${currentUser.id} has no capabilities in Entity Ownership Group ${groupId}`,
            );
        }
        const changingUserCapabilities = eog.userCapabilities.find(a => a.userId === changingUserId);
        if (!changingUserCapabilities) {
            throw new UnauthorizedException(
                `User ${changingUserId} has no capabilities in Entity Ownership Group ${groupId}`,
            );
        }
        const currentUserGroupCapabilities = currentUserCapabilities.groupCapabilities;
        if (currentUserGroupCapabilities.includes(Capability.OWNER)) {
            return;
        }
        if (changingUserCapabilities?.groupCapabilities.includes(Capability.OWNER)) {
            throw new UnauthorizedException(
                `User ${currentUser.id} can't change group owner capabilities in Entity Ownership Group ${groupId}`,
            );
        }
    }

    async assertUserDontGivingCapabilitiesToHimself(
        currentUser: UserAuthBackendDTO, userId: string
    ) {
        if (currentUser.id === userId) {
            throw new UnauthorizedException(
                `User ${currentUser.id} can't give capabilities to himself`,
            );
        }
    }

    async assertUserDontRemoveHimselfFromGroup(
        currentUser: UserAuthBackendDTO, userId: string
    ) {
        if (currentUser.id === userId) {
            throw new UnauthorizedException(
                `User ${currentUser.id} can't remove himself from group`,
            );
        }
    }


    async assertUserDontGivingCapabilitiesDoesntHave(
        currentUser: UserAuthBackendDTO, eogId: string, groupCapabilities: number[], entityCapabilities: EOGUserEntityCapabilityDTO[]
    ) {
        if (currentUser.roles.includes('ADMIN')) {
            return;
        }


        const eog = await this.eogService.getById(eogId);
        if (!eog) {
            throw new UnauthorizedException(
                `Entity Ownership Group ${eogId} not found`,
            );
        }
        const currentUserCapabilities = eog.userCapabilities.find(a => a.userId === currentUser.id);
        if (!currentUserCapabilities) {
            throw new UnauthorizedException(
                `User ${currentUser.id} has no capabilities in Entity Ownership Group ${eogId}`,
            );
        }
        const currentUserGroupCapabilities = currentUserCapabilities.groupCapabilities;
        const currentUserEntityCapabilities = currentUserCapabilities.entityCapabilities;
        if (currentUserGroupCapabilities.includes(Capability.OWNER)) {
            return;
        }

        // Check if the user is trying to give capabilities that he doesn't have
        for (const cap of groupCapabilities) {
            // exec(`kdialog --msgbox "User ${currentUser.id} can't give group capability ${cap} that he doesn't have in Entity Ownership Group ${eogId}"`);
            if (!currentUserGroupCapabilities.includes(cap)) {
                throw new UnauthorizedException(
                    `User ${currentUser.id} can't give group capability ${cap} that he doesn't have in Entity Ownership Group ${eogId}`,
                );
            }
        }

        for (const entityCap of entityCapabilities) {
            const userEntityCap = currentUserEntityCapabilities.find(a => a.entityGroup === entityCap.entityGroup && a.entityName === entityCap.entityName);
            if (!userEntityCap) {
                throw new UnauthorizedException(
                    `User ${currentUser.id} can't give entity capability ${entityCap.capability} for entity ${entityCap.entityGroup}/${entityCap.entityName} that he doesn't have in Entity Ownership Group ${eogId}`,
                );
            }
            if (entityCap.capabilities.some(cap => !userEntityCap.capabilities.includes(cap))) {
                throw new UnauthorizedException(
                    `User ${currentUser.id} can't give entity capability ${entityCap.capability} for entity ${entityCap.entityGroup}/${entityCap.entityName} that he doesn't have in Entity Ownership Group ${eogId}`,
                );
            }
        }
    }



}