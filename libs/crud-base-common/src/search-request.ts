export class SearchRequest {
    page: number;
    size: number;
    sortBy?: string;
    sortRotation?: 'desc' | 'asc';
}
