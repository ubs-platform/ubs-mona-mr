export type GroupCapability =
    | 'OWNER'
    | 'VIEWER'
    | 'ADJUST_MEMBERS'
    | 'ONLY_EDIT_MEMBER_CAPABILITIES';

export class EntityOwnershipGroupCreateDTO {
    groupName: string;
    description?: string;
    initialUserId: string;
    initialUserEntityCapability: string;
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

export class EOGUserCapabilityDTO {
    userId: string;
    userFullName?: string;
    capability?: string;
    groupCapability:
        | 'OWNER'
        | 'VIEWER'
        | 'ADJUST_MEMBERS'
        | 'ONLY_EDIT_MEMBER_CAPABILITIES';
    userCapabilityTemplateName?: string;
}


export class EOGUserCapabilityInviteDTO {
    userLogin: string;
    capability: string;
    groupCapability:
        | 'OWNER'
        | 'VIEWER'
        | 'ADJUST_MEMBERS'
        | 'ONLY_EDIT_MEMBER_CAPABILITIES';
    userCapabilityTemplateName?: string;
}
