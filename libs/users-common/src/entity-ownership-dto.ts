export class UserCapabilityDTO {
    userId: string;
    capability?: string;
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
}


export interface EntityOwnershipUserSearch {
    entityGroup: string;
    entityName: string;
    userId?: string;
    entityOwnershipGroupId?: string;
    capabilityAtLeastOne?: string[];
}

export interface EntityOwnershipSearch {
    entityGroup: string;
    entityName: string;
    entityId: string;
}

export interface EntityOwnershipUserCheck {
    entityGroup: string;
    entityName: string;
    entityId: string;
    // capability?: string;
    capabilityAtLeastOne?: string[];

    userId: string;
    entityOwnershipGroupId?: string;
}
