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
        @Inject('KAFKA_CLIENT')
        private kafkaClient: ClientProxy | ClientKafka | ClientRMQ,
    ) { }

    onModuleInit() {
        // Object.entries(EOChannelConsts).forEach(([key, val]) => {
        //     if (val instanceof String) {
        //         console.info(`Registering reply of ${val}`);
        //     }
        // });
        (this.kafkaClient as ClientKafka).subscribeToResponseOf?.(
            EOChannelConsts.checkOwnership,
        );
        (this.kafkaClient as ClientKafka).subscribeToResponseOf?.(
            EOChannelConsts.insertUserCapability,
        );
        (this.kafkaClient as ClientKafka).subscribeToResponseOf?.(
            EOChannelConsts.insertOwnership,
        );
        (this.kafkaClient as ClientKafka).subscribeToResponseOf?.(
            EOChannelConsts.searchOwnership,
        );
        (this.kafkaClient as ClientKafka).subscribeToResponseOf?.(
            EOChannelConsts.searchOwnershipUser,
        );

        // (this.userClient as ClientKafka).subscribeToResponseOf?.('user-by-id');
    }

    async insertOwnership(oe: EntityOwnershipDTO) {
        this.kafkaClient.emit(EOChannelConsts.insertOwnership, oe);
    }

    async insertUserCapability(oe: EntityOwnershipInsertCapabiltyDTO) {
        this.kafkaClient.emit(EOChannelConsts.insertUserCapability, oe);
    }

    // hasOwnershipDetailed(eo: EntityOwnershipUserCheck): Observable<UserCapabilityDTO> {
    //     return this.kafkaClient.send(EOChannelConsts.checkOwnershipDetailed, eo);
    // }
    hasOwnership(eo: EntityOwnershipUserCheck): Observable<UserCapabilityDTO> {
        return this.kafkaClient.send(EOChannelConsts.checkOwnership, eo);
    }
    searchOwnership(
        eo: EntityOwnershipSearch,
    ): Observable<EntityOwnershipDTO[]> {
        return this.kafkaClient.send(EOChannelConsts.searchOwnership, eo);
    }

    searchOwnershipUser(
        eo: EntityOwnershipUserSearch,
    ): Observable<EntityOwnershipDTO[]> {
        return this.kafkaClient.send(EOChannelConsts.searchOwnershipUser, eo);
    }



    searchOwnershipEntityIdsByUser(
        eo: EntityOwnershipUserSearch,
    ): Observable<string[]> {
        return this.kafkaClient.send(EOChannelConsts.searchEntityIdsByUser, eo);
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
