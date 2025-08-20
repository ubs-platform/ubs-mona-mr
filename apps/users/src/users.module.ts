import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './domain/user.model';
import { UserService } from './services/user.service';
import { UserController } from './web/user.controller';
import { AuthController } from './web/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtAuthLocalGuard } from './guard/jwt-local.guard';
import { JwtLocalStrategy } from './strategies/jwt-local-strategy';
import {
    EmailChangeRequest,
    EmailChangeRequestSchema,
} from './domain/email-change-request.schema';
import { EmailChangeRequestService } from './services/email-change-request.service';
import { UserAdminController } from './web/user-admin.controller';
import {
    PwResetRequest,
    PwResetRequestSchema,
} from './domain/pw-reset-request.schema';
import { PasswordResetService } from './services/password-reset.service';
import { ResetPasswordController } from './web/password-reset.controller';
import { ClientsModule } from '@nestjs/microservices';
import { EmailService } from './services/email.service';
import {
    EntityOwnership,
    EntityOwnershipSchema,
} from './domain/entity-ownership.schema';
import { EntityOwnershipController } from './web/entity-ownership.controller';
import { EntityOwnershipService } from './services/entity-ownership.service';
import { EntityOwnershipMapper } from './mapper/entity-ownership.mapper';
import { UserMicroserviceController } from './web/user-microservice.controller';
import { BackendJwtUtilsExportModule } from '@ubs-platform/users-microservice-helper';
import {
    E5NestClient,
    E5NestServer,
    MicroserviceSetupUtil,
} from '@ubs-platform/microservice-setup-util';
import { UserCandiate, UserCandiateSchema } from './domain/user-candiate.model';
import { UserCommonService } from './services/user-common.service';
import { UserRegisterService } from './services/user-register.service';
import { UserRegisterController } from './web/user-registration.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheManagerModule, CacheManagerService } from '@ubs-platform/cache-manager';

@Module({
    controllers: [
        UserController,
        AuthController,
        UserAdminController,
        ResetPasswordController,
        EntityOwnershipController,
        UserMicroserviceController,
        UserRegisterController,
    ],

    imports: [
        CacheManagerModule,
        ScheduleModule.forRoot(),
        MongooseModule.forRoot(
            `mongodb://${process.env.NX_MONGO_USERNAME}:${
                process.env.NX_MONGO_PASSWORD
            }@${process.env.NX_MONGO_URL || 'localhost'}/?authMechanism=DEFAULT`,
            {
                dbName: process.env.NX_MONGO_DBNAME || 'ubs_users',
            },
        ),
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: EntityOwnership.name, schema: EntityOwnershipSchema },
            { name: EmailChangeRequest.name, schema: EmailChangeRequestSchema },
            { name: PwResetRequest.name, schema: PwResetRequestSchema },
            { name: UserCandiate.name, schema: UserCandiateSchema },
        ]),
        ...BackendJwtUtilsExportModule,
        ClientsModule.register([
            MicroserviceSetupUtil.setupClient('', 'KAFKA_CLIENT'),
        ]),
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
    ],
    exports: [],
})
export class UsersModule {}
