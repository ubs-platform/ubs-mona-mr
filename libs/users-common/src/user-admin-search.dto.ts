import { SearchRequest } from '@ubs-platform/crud-base-common';

export interface UserAdminSearch extends SearchRequest {
    name: string;
    username: string;
}
