import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { GroupCapability } from '@ubs-platform/users-common';

@Schema()
export class EntityOwnershipGroupInvitation {
    _id?: any;

    @Prop({ type: String, required: true })
    invitedUserName: string;

    @Prop({ type: String, required: true })
    invitedUserId: string;

    @Prop({ type: String, required: true })
    invitedByUserId: string;

    @Prop({ type: String, required: true })
    invitedByUserName: string;

    @Prop({ type: String, required: true })
    entityOwnershipGroupId: string;

    @Prop({ type: String, required: true })
    groupCapability: GroupCapability;


    @Prop({ type: String, required: true })
    entityCapability: GroupCapability;

    @Prop({ type: Date, default: Date.now, required: true })
    createdAt: Date;
    
    @Prop(String)
    eogName: string;
    
    @Prop(String)
    eogDescription: string;


}

export type EntityOwnershipGroupInvitationDocument = EntityOwnershipGroupInvitation & Document;
export const EntityOwnershipGroupInvitationSchema =
    SchemaFactory.createForClass(EntityOwnershipGroupInvitation);
