import { Model } from 'mongoose';
import { IRepositoryWrap } from './repository-wrap';
import { RawSearchResult } from '@ubs-platform/crud-base-common/search-result';
import { MongooseSearchUtil } from './util/search.util';

export class MongoRepositoryWrap<MODEL>
    implements IRepositoryWrap<MODEL, string, Model<MODEL>>
{
    constructor(public m: Model<MODEL>) {}

    async findById(id: string): Promise<MODEL | null> {
        return this.m.findById(id).exec();
    }

    async findOne(params: any): Promise<MODEL | null> {
        return this.m.findOne(params).exec();
    }

    async saveModel(m: MODEL): Promise<MODEL> {
        const modelInstance = new this.m(m);
        return modelInstance.save() as any as Promise<MODEL>;
    }
    async deleteById(id: string): Promise<void> {
        await this.m.findByIdAndDelete(id).exec();
    }
    async search(params: any): Promise<MODEL[]> {
        return this.m.find(params).exec();
    }

    async modelSearch(
        size: number | string,
        page: number | string,
        sort: { [key: string]: 1 | -1 | 'asc' | 'desc' },
        // sortByFieldName: string | null | undefined,
        // sortByType: 'desc' | 'asc' | '' | null | undefined,
        ...searchParamsQuery: any[]
    ) {
        return MongooseSearchUtil.modelSearch<MODEL>(
            this.m,
            size,
            page,
            sort,
            ...searchParamsQuery,
        );
    }

    async findAll(): Promise<MODEL[]> {
        return this.m.find().exec();
    }

    async find(params: any): Promise<MODEL[]> {
        return this.m.find(params).exec();
    }

    rawRepository(): Model<MODEL> {
        return this.m;
    }
}
