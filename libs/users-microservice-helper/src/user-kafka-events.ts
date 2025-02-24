import { UserKafkaEvents as UserKafkaEvents_ } from '@ubs-platform/users-consts';
export class UserKafkaEvents extends UserKafkaEvents_ {
    static readonly USER_EDITED = 'user-edited';
    static readonly USER_DELETED = 'user-deleted';
}
