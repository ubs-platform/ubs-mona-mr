export class UserCapabilityDTO {
    userId: string;
    capability?: string;
}

export interface EntityOwnershipDTO {
    userCapabilities: UserCapabilityDTO[];
    entityGroup: string;
    entityName: string;
    entityId: string;
    overriderRoles: string[];
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
    userId: string;
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
    capability?: string;
    userId: string;
    entityOwnershipGroupId?: string;
}
