import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GroupCapability } from '@ubs-platform/users-common';
import { EntityOwnershipGroupEntityCapability } from './entity-ownership-group-entity-capability';

export class UserCapability {
    userId?: string;
    // capability?: string;
    groupCapability: GroupCapability;
    userFullName?: string;
    entityCapabilities: EntityOwnershipGroupEntityCapability[];
    /**
     * Group capability defines the ability of the EntityOwnershipGroup as a whole.
     */
    // canEdit: boolean;
    // canRemove: boolean;
    // canView: boolean;
}

@Schema()
export class EntityOwnershipGroup {
    _id?: any;

    @Prop([UserCapability])
    userCapabilities: UserCapability[];

    /**
     * Group name of the ownership group. Can be used for best reading
     */
    @Prop({ type: String })
    groupName?: string;

    @Prop({ type: String })
    description?: string;

    /**
     * List of roles that can override the ownership settings
     */
    @Prop({ type: [String], default: [] })
    overriderRoles?: string[] = [];

}

export type EntityOwnershipGroupDocument = EntityOwnershipGroup & Document;
export const EntityOwnershipGroupSchema =
    SchemaFactory.createForClass(EntityOwnershipGroup);
