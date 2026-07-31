import { Capability } from "./capability";

export type GroupCapability = 'OWNER' | 'VIEWER' | "EDITOR" | "META_EDIT" | 'ADJUST_MEMBERS' | 'ONLY_EDIT_MEMBER_CAPABILITIES';

export class EntityOwnershipGroupCommonDTO {
    // required when editing the EOG
    id?: string;
    name!: string;
    description!: string;
    // required when creating the EOG from microservice
    initialUserId?: string;
    // required when creating the EOG
    // initialUserId: string;
    // required when creating the EOG
    initialUserEntityCapabilities!: EOGUserEntityCapabilityDTO[];
    /**
     * required when creating the EOG
     * Default: OWNER
     */
    // initialUserGroupCapability?: GroupCapability;
}

export class EntityOwnershipGroupSearchDTO {
    id?: string;
    name!: string;
    description?: string;
    memberUserId?: string;
    admin?: "true" | "false";
}

export class EntityOwnershipGroupDTO {
    id?: string;
    name!: string;
    description?: string;
    // userCapabilities: EOGUserCapabilityDTO[];
}


export class EntityOwnershipGroupMetaDTO {
    id!: string;
    name!: string;
    description?: string;
    // userCapabilities: EOGUserCapabilityDTO[];
}

export class EOGUserEntityCapabilityDTO {
    entityGroup!: string;
    entityName!: string;
    /**
     * @deprecated string tabanlı capability alanı yerine capabilities alanı kullanılacak.
     */
    capability!: string;
    capabilities: Capability[] = [];
}
export class EOGUserCapabilityDTO {
    userId!: string;
    userFullName?: string;
    entityCapabilities!: EOGUserEntityCapabilityDTO[];
    /**
    * @deprecated string tabanlı capability alanı yerine capabilities alanı kullanılacak.
    */
    groupCapability!: GroupCapability;
    
    groupCapabilities: Capability[] = [];

}


export class EOGUserCapabilityInviteDTO {
    userLogin!: string;
    entityCapabilities!: EOGUserEntityCapabilityDTO[];
    /**
     * @deprecated string tabanlı capability alanı yerine capabilities alanı kullanılacak.
     */
    groupCapability!: GroupCapability;
    capabilities: Capability[] = [];

}


export class EOGUserCapabilityInvitationDTO {
    eogName!: string;
    eogDescription!: string;
    eogId!: string;
    invitedByUserId!: string;
    invitedByUserName!: string;
    userName!: string;
    userId!: string;
    invitationId!: string;
    entityCapabilities!: EOGUserEntityCapabilityDTO[];
    /**
     * @deprecated string tabanlı capability alanı yerine capabilities alanı kullanılacak.
     */
    groupCapability!: GroupCapability;
    capabilities: Capability[] = [];

}

export class EOGCheckUserGroupCapabilityDTO {
    entityOwnershipGroupId!: string;
    userId!: string;
    /**
     * @deprecated string tabanlı capability alanı yerine capabilities alanı kullanılacak.
     */
    groupCapabilitiesAtLeastOne!: GroupCapability[];
    orbitalGroupCapabilitiesAtLeastOne!: number[];
}


