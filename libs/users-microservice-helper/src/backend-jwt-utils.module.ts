import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BackendJwtUtilsExportModule } from './backend-jwt-utils-exports.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserService } from './service/user.service';
import { EntityOwnershipService } from './service/entity-ownership.service';
import { EntityOwnershipGroupClientService } from './service/entity-ownership-group-client.service';
import { E5NestClient, E5NestServer, MicroserviceSetupUtil } from '@ubs-platform/microservice-setup-util';
// import { JwtStrategy } from './strategies/jwt.strategy';
export const INTERNAL_COMMUNICATION = {
    port: parseInt(process.env['U_USERS_MONA_INTERNAL_COM_PORT'] || '0'),
    host: process.env['U_USERS_MONA_INTERNAL_COM_HOST'],
};

@Module({
    controllers: [],
    providers: [JwtStrategy, UserService, EntityOwnershipService, EntityOwnershipGroupClientService],
    exports: [UserService, EntityOwnershipService, EntityOwnershipGroupClientService],
    imports: [
        ...BackendJwtUtilsExportModule,

        ClientsModule.register([MicroserviceSetupUtil.setupClient("", "KAFKA_CLIENT")])
    ],
})
export class UserMicroserviceHelperModule { }

/**
 * @deprecated BackendJwtUtilsModule is deprecated, use UserMicroserviceHelperModule instead
 */
export const BackendJwtUtilsModule = UserMicroserviceHelperModule;
/**
 * todo: acaba BackendJwtUtilsModule yerine UserMicroserviceHelperModule mi yapsam
 */
