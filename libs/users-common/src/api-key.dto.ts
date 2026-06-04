export class ApiKeyEntityPermissionDTO {
    entityGroup: string;
    entityName: string;
    entityId?: string;
    permission: 'READ' | 'READ_WRITE';
}

export class ApiKeyCreateDTO {
    name: string;
    /**
     * If provided, the key will be owned by this group instead of the requesting user.
     * Requesting user must be a member of the group.
     */
    entityOwnershipGroupId?: string;
    permissionMode: 'ALL_READ' | 'ALL_READ_WRITE' | 'SPECIFIC';
    entityPermissions?: ApiKeyEntityPermissionDTO[];
    expiresAt?: Date;
}

/**
 * Returned when listing or fetching keys. Does NOT include the raw key hash.
 */
export class ApiKeyDTO {
    id: string;
    name: string;
    userId?: string;
    entityOwnershipGroupId?: string;
    active: boolean;
    permissionMode: 'ALL_READ' | 'ALL_READ_WRITE' | 'SPECIFIC';
    entityPermissions: ApiKeyEntityPermissionDTO[];
    expiresAt?: Date;
    lastUsedAt?: Date;
    createdAt?: Date;
}

/**
 * Returned only once on key creation. The rawKey will never be retrievable again.
 */
export class ApiKeyCreatedResponseDTO {
    key: ApiKeyDTO;
    /**
     * The raw API key. Store it securely — this is shown only once.
     */
    rawKey: string;
}
