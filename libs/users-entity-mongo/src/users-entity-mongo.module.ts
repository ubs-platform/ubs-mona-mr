import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entity/user.model';
import { UserCandiate, UserCandiateSchema } from './entity/user-candiate.model';
import { EmailChangeRequest, EmailChangeRequestSchema } from './entity/email-change-request.schema';
import { PwResetRequest, PwResetRequestSchema } from './entity/pw-reset-request.schema';
import { EntityOwnership, EntityOwnershipSchema } from './entity/entity-ownership.schema';
import { EntityOwnershipGroup, EntityOwnershipGroupSchema } from './entity/entity-ownership-group.schema';
import { EntityOwnershipGroupInvitation, EntityOwnershipGroupInvitationSchema } from './entity/entity-ownership-group-invitation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserCandiate.name, schema: UserCandiateSchema },
      { name: EmailChangeRequest.name, schema: EmailChangeRequestSchema },
      { name: PwResetRequest.name, schema: PwResetRequestSchema },
      { name: EntityOwnership.name, schema: EntityOwnershipSchema },
      { name: EntityOwnershipGroup.name, schema: EntityOwnershipGroupSchema },
      { name: EntityOwnershipGroupInvitation.name, schema: EntityOwnershipGroupInvitationSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class UsersEntityMongoModule {}
