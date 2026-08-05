import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EntityOwnershipGroupService } from '../services/entity-ownership-group.service';
import { UserAuthBackendDTO, EOGUserEntityCapabilityDTO, requestedCapabilitiesToString, Capability } from '@ubs-platform/users-common';
import { exec } from 'node:child_process';

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
                `User ${currentUser.id} can't give capabilities to themselves`,
            );
        }
    }

    async assertUserDontRemoveHimselfFromGroup(
        currentUser: UserAuthBackendDTO, userId: string
    ) {
        if (currentUser.id === userId) {
            throw new UnauthorizedException(
                `User ${currentUser.id} can't remove themselves from group`,
            );
        }
    }

    private getCapabilitiesNeedAttentions(newArray: number[], oldArray: number[]): number[] {
        const inserted = newArray.filter(value => !oldArray.includes(value));
        const removed = oldArray.filter(value => !newArray.includes(value));
        // İki filtreleme sonucunu birleştirip, tekrar edenleri kaldırmak için Set kullanıyoruz
        return [...new Set([...inserted, ...removed])];

        // const first =  arr1.filter(value => !arr2.includes(value));
        // const second = arr2.filter(value => !arr1.includes(value));
        // return [...new Set([...first, ...second])];
    }

    async assertUserDontGivingCapabilitiesDoesntHave(
        currentUser: UserAuthBackendDTO, eogId: string, changingUserGroupCaps: number[], changingUserECaps: EOGUserEntityCapabilityDTO[],
        changingUserId?: string
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
        const changingUserCapabilitiesCurrent = changingUserId ? eog.userCapabilities.find(a => a.userId === changingUserId) : { userId: currentUser.id, groupCapabilities: [], entityCapabilities: [] };

        if (!currentUserCapabilities) {
            throw new UnauthorizedException(
                `User ${currentUser.id} has no capabilities in Entity Ownership Group ${eogId}`,
            );
        }
        const currentUserGroupCapabilities = currentUserCapabilities.groupCapabilities;
        if (currentUserGroupCapabilities.includes(Capability.OWNER)) {
            return;
        }

        const groupCapabilitiesToCheck = this.getCapabilitiesNeedAttentions(changingUserGroupCaps, changingUserCapabilitiesCurrent?.groupCapabilities || []);
        // Check if the user is trying to give capabilities that they don't have
        for (const cap of groupCapabilitiesToCheck) {
            if (!currentUserGroupCapabilities.includes(cap)) {
                throw new UnauthorizedException(
                    `User ${currentUser.id} can't give group capability ${cap} that they don't have in Entity Ownership Group ${eogId}`,
                );
            }
        }
        const currentUserEntityCapabilitiesList = currentUserCapabilities.entityCapabilities;

        for (const changingUserECap of changingUserECaps) {



            const changingUserEntityCapabilitiesCurrent = changingUserCapabilitiesCurrent?.entityCapabilities.find(a => a.entityGroup === changingUserECap.entityGroup && a.entityName === changingUserECap.entityName) || { entityGroup: changingUserECap.entityGroup, entityName: changingUserECap.entityName, capabilities: [] };


            const entCapabilitiesToCheck = this.getCapabilitiesNeedAttentions(changingUserECap.capabilities, changingUserEntityCapabilitiesCurrent.capabilities);
            if (entCapabilitiesToCheck.length === 0) {
                continue;
            }
            const currentUserEntityCapabilities = currentUserEntityCapabilitiesList.find(a => a.entityGroup === changingUserECap.entityGroup && a.entityName === changingUserECap.entityName);
            // exec(`kdialog --msgbox "Changing user checking capabilities: ${JSON.stringify(entCapabilitiesToCheck)} - entity: ${changingUserECap.entityGroup}/${changingUserECap.entityName} - current user capabilities: ${JSON.stringify(currentUserEntityCapabilities?.capabilities)}"`);

            if (!currentUserEntityCapabilities) {
                throw new UnauthorizedException(
                    `User ${currentUser.id} can't give entity capabilities [${changingUserECap.capabilities.join(',')}] for entity ${changingUserECap.entityGroup}/${changingUserECap.entityName} that they don't have in Entity Ownership Group ${eogId}`,
                );
            }
            if (entCapabilitiesToCheck.some(cap => !currentUserEntityCapabilities.capabilities.includes(cap))) {
                throw new UnauthorizedException(
                    `User ${currentUser.id} can't give entity capabilities [${changingUserECap.capabilities.join(',')}] for entity ${changingUserECap.entityGroup}/${changingUserECap.entityName} that they don't have in Entity Ownership Group ${eogId}`,
                );
            }
        }
    }



}