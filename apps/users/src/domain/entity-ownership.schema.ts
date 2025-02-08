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

    @Prop([UserCapability])
    userCapabilities: UserCapability[];

    @Prop({ type: String })
    entityGroup?: String;

    @Prop({ type: String })
    entityName?: String;

    @Prop({ type: String })
    entityId?: String;

    @Prop({ type: [String], default: [] })
    overriderRoles?: String[] = [];

    @Prop({ type: String })
    parentOwnershipId?: String;
}

export type EntityOwnershipDocument = EntityOwnership & Document;
export const EntityOwnershipSchema =
    SchemaFactory.createForClass(EntityOwnership);
