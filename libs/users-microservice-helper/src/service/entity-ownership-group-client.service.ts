import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy, ClientKafka, ClientRMQ } from '@nestjs/microservices';
import {
    EntityOwnershipDTO,
    EntityOwnershipInsertCapabiltyDTO,
    EntityOwnershipSearch,
    EntityOwnershipUserCheck,
    EntityOwnershipUserSearch,
    UserCapabilityDTO,
    EntityOwnershipGroupCreateDTO,
    EntityOwnershipGroupDTO,
} from '@ubs-platform/users-common';
import { EOChannelConsts, EOGroupEventConsts } from '@ubs-platform/users-consts';
import { Observable } from 'rxjs';

@Injectable()
export class EntityOwnershipGroupClientService {
    constructor(
        @Inject('KAFKA_CLIENT')
        private kafkaClient: ClientProxy | ClientKafka | ClientRMQ,
    ) { }

    insert(eog: EntityOwnershipGroupCreateDTO): Observable<void> {
        return this.kafkaClient.send<void>(EOGroupEventConsts.createGroup, eog);
    }

    addUserCapability(groupId: string, userCapability: UserCapabilityDTO): Observable<void> {
        return this.kafkaClient.send<void>(EOGroupEventConsts.addUserCapability, { groupId, userCapability });
    }

    removeUserCapability(groupId: string, userId: string, capability: string): Observable<void> {
        return this.kafkaClient.send<void>(EOGroupEventConsts.removeUserCapability, { groupId, userId, capability });
    }

    getById(id: string): Observable<EntityOwnershipGroupDTO> {
        return this.kafkaClient.send<EntityOwnershipGroupDTO>(EOGroupEventConsts.getById, id);
    }

    searchByUserId(userId: string, capacity?: string): Observable<EntityOwnershipGroupDTO[]> {
        return this.kafkaClient.send<EntityOwnershipGroupDTO[]>(EOGroupEventConsts.searchByUserId, {userId, capacity});
    }

}
