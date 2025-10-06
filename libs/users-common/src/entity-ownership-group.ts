export class EntityOwnershipGroupDTO {
    groupName: string;
    description?: string;
    userCapabilities: EOGUserCapabilityDTO[];
}

export class EOGUserCapabilityDTO {
    userId: string;
    capability?: string;
    groupCapability: "OWNER" | "VIEWER" | "ADJUST_MEMBERS" | "ONLY_EDIT_MEMBER_CAPABILITIES";
}