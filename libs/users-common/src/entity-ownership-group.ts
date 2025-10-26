export type GroupCapability =
    | 'OWNER'
    | 'VIEWER'
    | 'ADJUST_MEMBERS'
    | 'ONLY_EDIT_MEMBER_CAPABILITIES';

export class EntityOwnershipGroupCreateDTO {
    groupName: string;
    description?: string;
    initialUserId: string;
    initialUserEntityCapabilities: EOGUserEntityCapabilityDTO[];
    /**
     * Default: OWNER
     */
    initialUserGroupCapability?: 'OWNER' | 'VIEWER' | 'ADJUST_MEMBERS' | 'ONLY_EDIT_MEMBER_CAPABILITIES';
}

export class EntityOwnershipGroupDTO {
    id?: string;
    groupName: string;
    description?: string;
    userCapabilities: EOGUserCapabilityDTO[];
}
export class EntityOwnershipGroupMetaDTO {
    id?: string;
    groupName: string;
    description?: string;
    userCapabilities: EOGUserCapabilityDTO[];
}

export class EOGUserEntityCapabilityDTO {
    entityGroup: string;
    entityName: string;
    capability: string;
}
export class EOGUserCapabilityDTO {
    userId: string;
    userFullName?: string;
    entityCapabilities: EOGUserEntityCapabilityDTO[];
    groupCapability:
        | 'OWNER'
        | 'VIEWER'
        | 'ADJUST_MEMBERS'
        | 'ONLY_EDIT_MEMBER_CAPABILITIES';
    userCapabilityTemplateName?: string;
}


export class EOGUserCapabilityInviteDTO {
    userLogin: string;
    entityCapabilities: EOGUserEntityCapabilityDTO[];
    groupCapability:
        | 'OWNER'
        | 'VIEWER'
        | 'ADJUST_MEMBERS'
        | 'ONLY_EDIT_MEMBER_CAPABILITIES';
    userCapabilityTemplateName?: string;
}


export class EOGUserCapabilityInvitationDTO {
    eogName: string;
    eogDescription: string;
    eogId: string;
    invitedByUserId: string;
    invitedByUserName: string;
    userName: string;
    userId: string;
    invitationId: string;
    // capability: string;
    entityCapabilities: EOGUserEntityCapabilityDTO[];
    groupCapability:
        | 'OWNER'
        | 'VIEWER'
        | 'ADJUST_MEMBERS'
        | 'ONLY_EDIT_MEMBER_CAPABILITIES';
}

export class EOGCheckUserGroupCapabilityDTO {
    entityOwnershipGroupId: string;
    userId: string;
    groupCapabilitiesAtLeastOne: GroupCapability[];
}


