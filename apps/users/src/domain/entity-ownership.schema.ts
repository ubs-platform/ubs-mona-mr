import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export class UserCapability {
    userId?: string;
    capability?: string;
    // canEdit: boolean;
    // canRemove: boolean;
    // canView: boolean;
}

@Schema({autoIndex: true, timestamps: true})
export class EntityOwnership {
    _id?: any;

    /**
     * List of users and their capabilities for this entity
     */
    @Prop([UserCapability])
    userCapabilities: UserCapability[];

    /** 
     * Group ID of the ownership group. Can be used for grouping users instead filling capabilities one by one
     */
    @Prop({ type: String })
    entityOwnershipGroupId?: string;

    /**
     *  Can be used for Application name
     */
    @Prop({ type: String, index: true })
    entityGroup?: string;

    /**
     * Name of the entity. Can be used for Entity Type (e.g. Project, Document etc.)
     */
    @Prop({ type: String, index: true })
    entityName?: string;

    /**
     * ID of the entity in the external system
     */
    @Prop({ type: String, index: true })
    entityId?: string;

    /**
     * List of roles that can override the ownership settings
     */
    @Prop({ type: [String], default: [] })
    overriderRoles?: string[] = [];

}

export type EntityOwnershipDocument = EntityOwnership & Document;
export const EntityOwnershipSchema =
    SchemaFactory.createForClass(EntityOwnership);

EntityOwnershipSchema.index(
    { entityGroup: 1, entityName: 1, entityId: 1 },
    { unique: true },
);
EntityOwnershipSchema.index({ entityOwnershipGroupId: 1 });