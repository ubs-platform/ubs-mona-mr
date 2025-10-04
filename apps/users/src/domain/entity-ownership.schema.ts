import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export class UserCapability {
    userId?: string;
    capability?: string;
    // canEdit: boolean;
    // canRemove: boolean;
    // canView: boolean;
}

@Schema()
export class EntityOwnership {
    _id?: any;

    /**
     * List of users and their capabilities for this entity
     */
    @Prop([UserCapability])
    userCapabilities: UserCapability[];

    /**
     * Group name of the entity. Can be used for Application name
     */
    @Prop({ type: String })
    entityGroup?: String;

    /**
     * Name of the entity. Can be used for Entity Type (e.g. Project, Document etc.)
     */
    @Prop({ type: String })
    entityName?: String;

    /**
     * ID of the entity in the external system
     */
    @Prop({ type: String })
    entityId?: String;

    /**
     * List of roles that can override the ownership settings
     */
    @Prop({ type: [String], default: [] })
    overriderRoles?: String[] = [];

}

export type EntityOwnershipDocument = EntityOwnership & Document;
export const EntityOwnershipSchema =
    SchemaFactory.createForClass(EntityOwnership);
