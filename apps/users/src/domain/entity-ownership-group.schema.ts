import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export class UserCapability {
    userId?: string;
    capability?: string;
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
    groupName?: String;

    /**
     * List of roles that can override the ownership settings
     */
    @Prop({ type: [String], default: [] })
    overriderRoles?: String[] = [];

}

export type EntityOwnershipGroupDocument = EntityOwnershipGroup & Document;
export const EntityOwnershipGroupSchema =
    SchemaFactory.createForClass(EntityOwnershipGroup);
