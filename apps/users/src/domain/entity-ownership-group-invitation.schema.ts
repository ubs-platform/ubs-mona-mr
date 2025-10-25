import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GroupCapability } from '@ubs-platform/users-common';
import { EntityOwnershipGroupEntityCapability } from './entity-ownership-group-entity-capability';

@Schema()
export class EntityOwnershipGroupInvitation {
    _id?: any;

    @Prop(String)
    invitedUserName: string;

    @Prop(String)
    invitedUserId: string;

    @Prop(String)
    invitedByUserId: string;

    @Prop(String)
    invitedByUserName: string;

    @Prop(String)
    entityOwnershipGroupId: string;

    @Prop(String)
    groupCapability: GroupCapability;

    @Prop([EntityOwnershipGroupEntityCapability])
    entityCapabilities: EntityOwnershipGroupEntityCapability[];

    @Prop({ type: Date, default: Date.now, required: true })
    createdAt: Date;
    
    @Prop(String)
    eogName: string;
    
    @Prop(String)
    eogDescription: string;

    @Prop(String)
    eogId: string;


}

export type EntityOwnershipGroupInvitationDocument = EntityOwnershipGroupInvitation & Document;
export const EntityOwnershipGroupInvitationSchema =
    SchemaFactory.createForClass(EntityOwnershipGroupInvitation);
