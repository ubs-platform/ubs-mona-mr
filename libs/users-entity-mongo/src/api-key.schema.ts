import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export class ApiKeyEntityPermission {
    /**
     * Application name (e.g. "postral", "lotus")
     */
    entityGroup!: string;

    /**
     * Entity type (e.g. "Payment", "Document"). Use "*" to target all entity types in the group.
     */
    entityName!: string;

    /**
     * Specific entity ID. If omitted, the permission applies to all entities of this type.
     */
    entityId?: string;

    /**
     * READ: read-only access. READ_WRITE: full access.
     */
    permission!: 'READ' | 'READ_WRITE';
}

@Schema({ timestamps: true, autoIndex: true })
export class ApiKey {
    _id?: any;

    /**
     * SHA-256 hash of the raw API key. The raw key is never stored.
     */
    @Prop({ required: true, unique: true, index: true })
    keyHash!: string;

    /**
     * Human-readable label for this key (e.g. "CI/CD Pipeline", "Reporting Bot")
     */
    @Prop({ required: true })
    name!: string;

    /**
     * The user who owns this key. Either userId or entityOwnershipGroupId must be set.
     */
    @Prop({ type: String, index: true })
    userId?: string;

    /**
     * The ownership group that owns this key. Either userId or entityOwnershipGroupId must be set.
     */
    @Prop({ type: String, index: true })
    entityOwnershipGroupId?: string;

    /**
     * Whether the key is active. Revoked keys remain in DB but cannot authenticate.
     */
    @Prop({ default: true })
    active: boolean = true;

    /**
     * Optional expiration date. After this date the key is considered invalid.
     */
    @Prop({ type: Date })
    expiresAt?: Date;

    /**
     * Permission mode:
     * - ALL_READ: key grants read-only access to all entities the owner has access to
     * - ALL_READ_WRITE: key grants full access to all entities the owner has access to
     * - SPECIFIC: key is limited to the entityPermissions list below
     */
    @Prop({ type: String, enum: ['ALL_READ', 'ALL_READ_WRITE', 'SPECIFIC'], required: true })
    permissionMode!: 'ALL_READ' | 'ALL_READ_WRITE' | 'SPECIFIC';

    /**
     * Fine-grained entity permissions. Only used when permissionMode is SPECIFIC.
     */
    @Prop([ApiKeyEntityPermission])
    entityPermissions: ApiKeyEntityPermission[] = [];

    /**
     * Last time this key was used for authentication. Updated at most once per minute to avoid write storms.
     */
    @Prop({ type: Date })
    lastUsedAt?: Date;
}

export type ApiKeyDocument = ApiKey & { _id: any; lastUsedAt?: Date };
export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);
