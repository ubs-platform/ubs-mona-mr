import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy, ClientKafka, ClientRMQ } from '@nestjs/microservices';
import {
    EntityOwnershipDTO,
    EntityOwnershipInsertCapabiltyDTO,
    EntityOwnershipSearch,
    EntityOwnershipUserCheck,
    EntityOwnershipUserSearch,
    UserCapabilityDTO,
    EntityOwnershipCreateDTO,
} from '@ubs-platform/users-common';
import { EOChannelConsts, EOGroupEventConsts } from '@ubs-platform/users-consts';
import { EntityOwnershipGroupDocument } from 'apps/users/src/domain/entity-ownership-group.schema';
import { Observable } from 'rxjs';

@Injectable()
export class EntityOwnershipService {
    constructor(
        @Inject('KAFKA_CLIENT')
        private kafkaClient: ClientProxy | ClientKafka | ClientRMQ,
    ) { }

    insert(oe: EntityOwnershipCreateDTO): Observable<void> {
        return this.kafkaClient.send<void>(EOGroupEventConsts.addUserCapability, oe);
    }

}
