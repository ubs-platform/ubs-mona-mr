import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy, ClientKafka, ClientRMQ } from '@nestjs/microservices';
import { UserDTO } from '@ubs-platform/users-common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UserService implements OnModuleInit {
    constructor(
        @Inject('KAFKA_CLIENT')
        private kafkaClient: ClientProxy | ClientKafka | ClientRMQ,
    ) {}
    onModuleInit() {
        (this.kafkaClient as ClientKafka).subscribeToResponseOf?.('user-by-id');
    }

    async findUserAuth(userId: any): Promise<UserDTO> {
        
        console.debug('Fetching user');
        const user = (await firstValueFrom(
            this.kafkaClient.send('user-by-id', userId),
        )) as UserDTO;
        console.debug(`The request made by: ${user.name} ${user.surname}`);
        return user;
    }
}
