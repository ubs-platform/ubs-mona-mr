import { RawSearchResult } from "@ubs-platform/crud-base-common/search-result";

export interface IRepositoryWrap<MODEL, ID, REPO extends any> {
    findById(id: ID): Promise<MODEL | null>;
    saveModel(m: MODEL): Promise<MODEL>;
    deleteById(id: ID): Promise<void>;
    search(params: any): Promise<MODEL[]>;
    findAll(): Promise<MODEL[]>;
    find(params: any): Promise<MODEL[]>;
    findOne(params: any): Promise<MODEL | null>;
    modelSearch(
        size: number | string,
        page: number | string,
        sort: { [key: string]: 1 | -1 | 'asc' | 'desc' },
        ...searchParamsQuery: any[]
    ): Promise<RawSearchResult<MODEL>>;
    rawRepository(): REPO;
}