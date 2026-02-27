import { SearchRequest, SearchResult } from '@ubs-platform/crud-base-common';
import { FilterQuery } from 'mongoose';
import { BaseCrudKlass } from './base-crud-klass';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';
import { IRepositoryWrap } from './repository-wrap';


export abstract class BaseCrudService<
    MODEL,
    ID,
    INPUT,
    OUTPUT,
    SEARCH,
> extends BaseCrudKlass {

    constructor(public m: IRepositoryWrap<MODEL, ID, any>) {
        super();
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
        const page = searchAndPagination?.page || 0,
            size = searchAndPagination?.size || 10;

        let s = await this.searchParams(searchAndPagination, user); //{ ...searchAndPagination, page: undefined, size: undefined };
        let sort;
        if (searchAndPagination?.sortBy && searchAndPagination.sortRotation) {
            sort = {};
            sort[searchAndPagination.sortBy] = searchAndPagination.sortRotation;
        }
        return (
            await this.m.modelSearch(size, page, sort, {
                $match: s,
            })
        ).mapAsync((a) => this.toOutput(a));
    }

    async fetchAll(
        s?: Partial<SEARCH>,
        user?: UserAuthBackendDTO,
    ): Promise<OUTPUT[]> {
        const list = await this.m.find(await this.searchParams(s, user));
        return await this.convertAndReturnTheList(list, user);
    }

    async fetchOne(id: ID, user?: UserAuthBackendDTO): Promise<OUTPUT> {
        return this.toOutput((await this.m.findById(id)) as MODEL);
    }

    async create(input: INPUT, user?: UserAuthBackendDTO): Promise<OUTPUT> {
        let newModel = this.generateNewModel();
        await this.moveIntoModel(newModel, input);
        await this.beforeCreateOrEdit(newModel, input, 'CREATE', user);
        await this.m.saveModel(newModel);
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

        return this.toOutput(newModel as MODEL);
    }

    async remove(id: ID, ruser?: UserAuthBackendDTO): Promise<OUTPUT> {
        let ac = (await this.m.findById(id)) as MODEL;
        // awaited tipine gerçekten gerek var mıydı.... 😭😭😭
        await this.beforeRemove(ac, ruser);
        await this.m.deleteById(id);
        return this.toOutput(ac as MODEL);
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
