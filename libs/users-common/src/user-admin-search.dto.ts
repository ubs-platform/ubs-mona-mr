import { SearchRequest } from '@ubs-platform/crud-base-common';

export class UserAdminSearch implements SearchRequest {
    name: string;
    username: string;
    page: number;
    size: number;
    sortBy?: string;
    sortRotation?: 'desc' | 'asc';
}
