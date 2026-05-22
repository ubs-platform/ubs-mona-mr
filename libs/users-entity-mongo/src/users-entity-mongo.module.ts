import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BaseRepositoryModule } from '@ubs-platform/entity-base';
import { User, UserSchema } from './user.model';
import { UserCandiate, UserCandiateSchema } from './user-candiate.model';
import { EmailChangeRequest, EmailChangeRequestSchema } from './email-change-request.schema';
import { PwResetRequest, PwResetRequestSchema } from './pw-reset-request.schema';
import { EntityOwnership, EntityOwnershipSchema } from './entity-ownership.schema';
import { EntityOwnershipGroup, EntityOwnershipGroupSchema } from './entity-ownership-group.schema';
import { EntityOwnershipGroupInvitation, EntityOwnershipGroupInvitationSchema } from './entity-ownership-group-invitation.schema';

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
    BaseRepositoryModule.forFeature([
      User,
      UserCandiate,
      EmailChangeRequest,
      PwResetRequest,
      EntityOwnership,
      EntityOwnershipGroup,
      EntityOwnershipGroupInvitation,
    ], 'mongo'),
  ],
  exports: [MongooseModule, BaseRepositoryModule],
})
export class UsersEntityMongoModule {}
