import { SearchRequest, SearchResult } from '@ubs-platform/crud-base-common';
import { FilterQuery } from 'mongoose';
import { BaseCrudKlass } from './base-crud-klass';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';
import { IRepositoryWrap } from './repository-wrap';
import { Inject, Optional } from '@nestjs/common';
import { CacheManagerService } from '@ubs-platform/cache-manager';
import { randomUUID } from 'crypto';


export abstract class BaseCrudService<
    MODEL,
    ID,
    INPUT,
    OUTPUT,
    SEARCH,
> extends BaseCrudKlass {
    protected readonly isCacheEnabled = true;
    protected readonly cacheLiveTimeMs = 3000;
    protected readonly cacheKeyPrefix: string;

    @Optional()
    @Inject(CacheManagerService)
    protected readonly cacheManager?: CacheManagerService;

    constructor(public m: IRepositoryWrap<MODEL, ID, any>) {
        super();
        const klassName = this.constructor?.name?.trim();
        this.cacheKeyPrefix = klassName
            ? `crud:${klassName}`
            : `crud:${randomUUID()}`;
    }
    
    abstract generateNewModel(): MODEL;
    abstract getIdFieldNameFromInput(i: INPUT): ID;
    abstract getIdFieldNameFromModel(i: MODEL): ID;
    abstract toOutput(m: MODEL): Promise<OUTPUT> | OUTPUT;
    abstract moveIntoModel(model: MODEL, i: INPUT): Promise<MODEL> | MODEL;
    abstract searchParams(
        s?: Partial<SEARCH>,
        u?: UserAuthBackendDTO,
    ): Promise<FilterQuery<MODEL>>;

    async convertAndReturnTheList(list: MODEL[], user?: UserAuthBackendDTO) {
        const outputList: OUTPUT[] = [];
        for (let index = 0; index < list.length; index++) {
            const item = list[index];
            outputList.push(await this.toOutput(item));
        }
        return outputList;
    }

    async searchPagination(
        searchAndPagination?: SEARCH & SearchRequest,
        user?: UserAuthBackendDTO,
    ): Promise<SearchResult<OUTPUT>> {
        return this.withShortCache(
            this.buildCacheKey('searchPagination', searchAndPagination, user),
            async () => {
                const page = searchAndPagination?.page || 0,
                    size = searchAndPagination?.size || 10;

                let s = await this.searchParams(searchAndPagination, user); //{ ...searchAndPagination, page: undefined, size: undefined };
                let sort;
                if (
                    searchAndPagination?.sortBy &&
                    searchAndPagination.sortRotation
                ) {
                    sort = {};
                    sort[searchAndPagination.sortBy] =
                        searchAndPagination.sortRotation;
                }
                return (
                    await this.m.modelSearch(size, page, sort, {
                        $match: s,
                    })
                ).mapAsync((a) => this.toOutput(a));
            },
        );
    }

    async fetchAll(
        s?: Partial<SEARCH>,
        user?: UserAuthBackendDTO,
    ): Promise<OUTPUT[]> {
        return this.withShortCache(this.buildCacheKey('fetchAll', s, user), async () => {
            const list = await this.m.find(await this.searchParams(s, user));
            return await this.convertAndReturnTheList(list, user);
        });
    }

    async fetchOne(id: ID, user?: UserAuthBackendDTO): Promise<OUTPUT> {
        return this.withShortCache(this.buildCacheKey('fetchOne', id, user), async () => {
            return this.toOutput((await this.m.findById(id)) as MODEL);
        });
    }

    async create(input: INPUT, user?: UserAuthBackendDTO): Promise<OUTPUT> {
        let newModel = this.generateNewModel();
        await this.moveIntoModel(newModel, input);
        await this.beforeCreateOrEdit(newModel, input, 'CREATE', user);
        await this.m.saveModel(newModel);
        this.invalidateSelfCache();
        // await (newModel as HydratedDocument<MODEL, {}, unknown>).save();
        const out = await this.toOutput(newModel);
        await this.afterCreate(out, input, user);
        return out;
    }

    async edit(input: INPUT, user?: UserAuthBackendDTO): Promise<OUTPUT> {
        const newModelFirst = await this.m.findById(
            this.getIdFieldNameFromInput(input),
        );

        const newModel = await this.moveIntoModel(
            newModelFirst as MODEL,
            input,
        );

        await this.beforeCreateOrEdit(newModel, input, 'EDIT', user);

        await this.m.saveModel(newModel);
        this.invalidateSelfCache();

        return this.toOutput(newModel as MODEL);
    }

    async remove(id: ID, ruser?: UserAuthBackendDTO): Promise<OUTPUT> {
        let ac = (await this.m.findById(id)) as MODEL;
        // awaited tipine gerçekten gerek var mıydı.... 😭😭😭
        await this.beforeRemove(ac, ruser);
        await this.m.deleteById(id);
        this.invalidateSelfCache();
        return this.toOutput(ac as MODEL);
    }

    protected async withShortCache<T>(key: string, cb: () => Promise<T>): Promise<T> {
        if (!this.isCacheEnabled || !this.cacheManager) {
            return cb();
        }
        return this.cacheManager.getOrCallAsync(key, cb, {
            livetime: this.cacheLiveTimeMs,
            livetimeExtending: 'ON_GET',
        });
    }

    protected buildCacheKey(method: string, ...parts: unknown[]): string {
        const serialized = parts.map((part) => this.serializeCachePart(part));
        return `${this.cacheKeyPrefix}:${method}:${serialized.join('|')}`;
    }

    protected serializeCachePart(part: unknown): string {
        try {
            return JSON.stringify(part);
        } catch {
            return String(part);
        }
    }

    protected invalidateSelfCache(): void {
        if (!this.isCacheEnabled || !this.cacheManager) {
            return;
        }
        const escapedPrefix = this.cacheKeyPrefix.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&',
        );
        this.cacheManager.invalidateRegex(new RegExp(`^${escapedPrefix}:`));
    }

    async afterCreate(m: OUTPUT, input: INPUT, user?: UserAuthBackendDTO) {}

    async beforeCreateOrEdit(
        model: MODEL,
        input: INPUT,
        mode: 'EDIT' | 'CREATE',
        user?: UserAuthBackendDTO,
    ) {}

    async beforeRemove(model: MODEL, user?: UserAuthBackendDTO) {
    }

}

// return BaseCrudService;
