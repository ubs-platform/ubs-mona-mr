import { Capability } from "./capability";

export class UserCapabilityDTO {
    userId!: string;
    capability?: string;
    capabilities: Capability[] = [];
}

export interface EntityOwnershipRemoveUserCapabilityDTO {
    userId: string;
}

export interface EntityOwnershipSetGroupIdDTO {
    userId: string;
    groupId: string;
}

export interface EntityOwnershipDTO {
    userCapabilities: UserCapabilityDTO[];
    entityGroup: string;
    entityName: string;
    entityId: string;
    overriderRoles: string[];
    entityOwnershipGroupId: string;
}

export interface EntityOwnershipInsertCapabiltyDTO {
    entityGroup: string;
    entityName: string;
    entityId: string;
    userId: string;
    capability: string;
    capabilities: Capability[];

}


export interface EntityOwnershipUserSearch {
    entityGroup: string;
    entityName: string;
    userId?: string;
    entityOwnershipGroupId?: string;
    /**
     * @deprecated string tabanlı capability alanı yerine capabilities alanı kullanılacak.
     */
    capabilityAtLeastOne?: string[];
    numericCapabilityAtLeastOne?: number[];
}

export interface EntityOwnershipSearch {
    entityGroup: string;
    entityName: string;
    entityId?: string;
}

export interface EntityOwnershipUserCheck {
    entityGroup: string;
    entityName: string;
    entityId?: string;
    /**
     * @deprecated string tabanlı capability alanı yerine capabilities alanı kullanılacak.
     */
    capabilityAtLeastOne?: string[];
    numericCapabilityAtLeastOne?: number[];

    userId: string;
    entityOwnershipGroupId?: string;
}

export interface EntityOwnershipGroupIdCheck {
    entityGroup: string;
    entityName: string;
    entityId?: string;
    /**
 * @deprecated string tabanlı capability alanı yerine capabilities alanı kullanılacak.
 */
    capabilityAtLeastOne?: string[];
    numericCapabilityAtLeastOne?: number[];
    entityOwnershipGroupId: string;
}
