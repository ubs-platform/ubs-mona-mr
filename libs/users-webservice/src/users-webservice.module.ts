import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { CacheManagerModule } from '@ubs-platform/cache-manager';
import { BackendJwtUtilsExportModule } from '@ubs-platform/users-microservice-helper';
import { MICROSERVICE_CLIENT, MicroservicesCommonModule, MicroserviceSetupUtil } from '@ubs-platform/microservice-setup-util';
import { UsersEntityMongoModule } from '@ubs-platform/users-entity-mongo';
import { UserController } from './web/user.controller';
import { AuthController } from './web/auth.controller';
import { UserAdminController } from './web/user-admin.controller';
import { ResetPasswordController } from './web/password-reset.controller';
import { EntityOwnershipController } from './web/entity-ownership.controller';
import { UserMicroserviceController } from './web/user-microservice.controller';
import { UserRegisterController } from './web/user-registration.controller';
import { EntityOwnershipGroupMicroserviceController } from './web/entity-ownership-group-microservice.controller';
import { EntityOwnershipGroupController } from './web/entity-ownership-group.controller';
import { EntityOwnershipGroupMemberController } from './web/entity-ownership-group-member.controller';
import { ApiKeyController } from './web/api-key.controller';
import { UserService } from './services/user.service';
import { UserCommonService } from './services/user-common.service';
import { UserRegisterService } from './services/user-register.service';
import { AuthService } from './services/auth.service';
import { EmailChangeRequestService } from './services/email-change-request.service';
import { PasswordResetService } from './services/password-reset.service';
import { EmailService } from './services/email.service';
import { EntityOwnershipService } from './services/entity-ownership.service';
import { EntityOwnershipGroupService } from './services/entity-ownership-group.service';
import { ApiKeyService } from './services/api-key.service';
import { JwtAuthLocalGuard } from './guard/jwt-local.guard';
import { JwtLocalStrategy } from './strategies/jwt-local-strategy';
import { EntityOwnershipMapper } from './mapper/entity-ownership.mapper';
import { EntityOwnershipGroupMapper } from './mapper/entity-ownership-group.mapper';

@Module({
  imports: [
    UsersEntityMongoModule,
    CacheManagerModule,
    ...BackendJwtUtilsExportModule,
    MicroservicesCommonModule
    // ClientsModule.register([MicroserviceSetupUtil.setupClient('', MICROSERVICE_CLIENT)]),
  ],
  controllers: [
    UserController,
    AuthController,
    UserAdminController,
    ResetPasswordController,
    EntityOwnershipController,
    UserMicroserviceController,
    UserRegisterController,
    EntityOwnershipGroupMicroserviceController,
    EntityOwnershipGroupController,
    EntityOwnershipGroupMemberController,
    ApiKeyController,
  ],
  providers: [
    UserService,
    UserCommonService,
    UserRegisterService,
    AuthService,
    EmailChangeRequestService,
    JwtAuthLocalGuard,
    JwtLocalStrategy,
    PasswordResetService,
    EmailService,
    EntityOwnershipService,
    EntityOwnershipMapper,
    EntityOwnershipGroupService,
    EntityOwnershipGroupMapper,
    ApiKeyService,
  ],
  exports: [UserService, UserCommonService, AuthService, EntityOwnershipService, EntityOwnershipGroupService],
})
export class UsersWebserviceModule {}
