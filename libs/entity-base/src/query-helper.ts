export abstract class QueryHelper<ENTITY_OUT, ENTITY_SAVE = ENTITY_OUT> {

    abstract delete(id: string): Promise<void>;

    abstract findById(id: string): Promise<ENTITY_OUT | null>;

    abstract searchParams(
        searchAndPagination: any,
    ): any;

    abstract save(entity: ENTITY_SAVE): Promise<ENTITY_OUT | null>;
}