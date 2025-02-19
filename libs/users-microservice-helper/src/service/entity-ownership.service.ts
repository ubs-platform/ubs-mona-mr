import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy, ClientKafka, ClientRMQ } from '@nestjs/microservices';
import {
    EntityOwnershipDTO,
    EntityOwnershipInsertCapabiltyDTO,
    EntityOwnershipSearch,
    EntityOwnershipUserCheck,
    EntityOwnershipUserSearch,
    UserCapabilityDTO,
} from '@ubs-platform/users-common';
import { EOChannelConsts } from '@ubs-platform/users-consts';
import { Observable } from 'rxjs';

@Injectable()
export class EntityOwnershipService implements OnModuleInit {
    constructor(
        @Inject('USER_MICROSERVICE')
        private userClient: ClientProxy | ClientKafka | ClientRMQ,
        @Inject('KAFKA_CLIENT')
        private kafkaClient: ClientProxy | ClientKafka | ClientRMQ,
    ) {}

    onModuleInit() {
        // (this.userClient as ClientKafka).subscribeToResponseOf?.('user-by-id');
    }

    async insertOwnership(oe: EntityOwnershipDTO) {
        this.kafkaClient.emit(EOChannelConsts.insertOwnership, oe);
    }

    async insertUserCapability(oe: EntityOwnershipInsertCapabiltyDTO) {
        this.kafkaClient.emit(EOChannelConsts.insertUserCapability, oe);
    }

    hasOwnership(eo: EntityOwnershipUserCheck): Observable<UserCapabilityDTO> {
        return this.userClient.send(EOChannelConsts.checkOwnership, eo);
    }

    searchOwnership(
        eo: EntityOwnershipSearch,
    ): Observable<EntityOwnershipDTO[]> {
        return this.userClient.send(EOChannelConsts.searchOwnership, eo);
    }

    searchOwnershipUser(
        eo: EntityOwnershipUserSearch,
    ): Observable<EntityOwnershipDTO[]> {
        return this.userClient.send(EOChannelConsts.searchOwnershipUser, eo);
    }

    async deleteOwnership(oe: EntityOwnershipSearch) {
        this.kafkaClient.emit(EOChannelConsts.deleteOwnership, oe);
    }

    // async findUserAuth(userId: any): Promise<UserDTO> {
    //   console.debug('Fetching user');
    //   const user = (await firstValueFrom(
    //     this.userClient.send('user-by-id', userId)
    //   )) as UserDTO;
    //   console.debug(`The request made by: ${user.name} ${user.surname}`);
    //   return user;
    // }
}
