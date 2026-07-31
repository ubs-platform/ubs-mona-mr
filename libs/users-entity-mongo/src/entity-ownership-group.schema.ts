import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Capability, GroupCapability } from '@ubs-platform/users-common';
import { EntityOwnershipGroupEntityCapability } from './entity-ownership-group-entity-capability';

export class GroupUserCapability {
    userId?: string;
    /**
     * @deprecated string tabanlı capability alanı yerine orbitalGroupCapability alanı kullanılacak.
     */
    groupCapability: GroupCapability = "VIEWER";
    groupCapabilities: Capability[] = [];
    userFullName?: string;
    entityCapabilities: EntityOwnershipGroupEntityCapability[] = [];

}

@Schema()
export class EntityOwnershipGroup {
    _id?: any;

    @Prop([GroupUserCapability])
    userCapabilities: GroupUserCapability[] = [];

    /**
     * Group name of the ownership group. Can be used for best reading
     */
    @Prop({ type: String })
    name?: string;

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
