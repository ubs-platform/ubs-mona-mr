import { Capability } from "./capability";

export class UserCapabilityDTO {
    userId!: string;
    capability?: string;
    capabilities: Capability[] = [];
}

export class EntityOwnershipRemoveUserCapabilityDTO {
    userId: string;
}

export class EntityOwnershipSetGroupIdDTO {
    userId: string;
    groupId: string;
}

export class EntityOwnershipDTO {
    userCapabilities: UserCapabilityDTO[];
    entityGroup: string;
    entityName: string;
    entityId: string;
    overriderRoles: string[];
    entityOwnershipGroupId: string;
}

export class EntityOwnershipInsertCapabiltyDTO {
    entityGroup: string;
    entityName: string;
    entityId: string;
    userId: string;
    capabilities: Capability[];

}


export class EntityOwnershipUserSearch {
    entityGroup: string;
    entityName: string;
    userId?: string;
    entityOwnershipGroupId?: string;
    requestedCapabilities?: number[][];

}

export class EntityOwnershipSearch {
    entityGroup: string;
    entityName: string;
    entityId?: string;
}

export class EntityOwnershipUserCheck {
    entityGroup: string;
    entityName: string;
    entityId?: string;
    requestedCapabilities?: number[][];
    userId: string;
    entityOwnershipGroupId?: string;
}

export class EntityOwnershipGroupIdCheck {
    entityGroup: string;
    entityName: string;
    entityId?: string;
    requestedCapabilities?: number[][];
    entityOwnershipGroupId: string;
}
