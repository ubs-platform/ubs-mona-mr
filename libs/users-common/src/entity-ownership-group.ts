export class EntityOwnershipGroupDTO {
    groupName: string;
    description?: string;
    userCapabilities: UserCapabilityDTO[];
}

export class UserCapabilityDTO {
    userId: string;
    capability?: string;
}