import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SearchResult } from '@ubs-platform/crud-base-common';
import { FilterQuery, HydratedDocument, Model, ObjectId } from 'mongoose';
import { BaseCrudKlass } from './base-crud-klass';

export abstract class BaseCrudService<
    MODEL,
    INPUT extends { _id?: any },
    OUTPUT,
    SEARCH,
> extends BaseCrudKlass {
    constructor(public m: Model<MODEL>) {
        super();
    }

    abstract toOutput(m: MODEL): Promise<OUTPUT> | OUTPUT;
    abstract moveIntoModel(model: MODEL, i: INPUT): Promise<MODEL> | MODEL;
    abstract searchParams(s?: Partial<SEARCH>): FilterQuery<MODEL>;

    private async fetchFilteredAndPaginated(
        s: SEARCH & { page: number; size: number },
    ) {
        const results = await this.m.aggregate([
            {
                $facet: {
                    total: [{ $count: 'total' }],
                    data: [
                        { $skip: (s.size || 10) * (s.page || 1) },
                        // lack of convert to int
                        { $limit: parseInt(s.size as any as string) },
                        { $sort: { _id: 1 } },
                    ],
                },
            },
        ]);

        const maxItemLength = results[0].total[0].count;
        const list = results[0].data;
        return { list, maxItemLength };
    }

    async convertAndReturnTheList(list: MODEL[]) {
        const outputList: OUTPUT[] = [];
        for (let index = 0; index < list.length; index++) {
            const item = list[index];
            outputList.push(await this.toOutput(item));
        }
        return outputList;
    }

    async searchResult(
        modelList: MODEL[],
        page: number,
        size: number,
        maxItemLength: number,
    ): Promise<SearchResult<OUTPUT>> {
        const itemLengthThing = Math.ceil(maxItemLength / size);
        const maxPagesIndex = size ? itemLengthThing - 1 : 0;
        return {
            content: await this.convertAndReturnTheList(modelList),
            page,
            size,
            maxItemLength,
            maxPagesIndex,
            lastPage: maxPagesIndex <= page,
            firstPage: page == 0,
        };
    }

    async searchPagination(
        s?: SEARCH & { page?: number; size?: number },
    ): Promise<SearchResult<OUTPUT>> {
        const page = s?.page || 0,
            size = s?.size || 10;
        const { list, maxItemLength } = await this.fetchFilteredAndPaginated({
            ...(s || ({} as SEARCH)),
            page: page,
            size: size,
        });

        return this.searchResult(list, page, size, maxItemLength);
    }

    async fetchAll(s?: Partial<SEARCH>): Promise<OUTPUT[]> {
        const list = await this.m.find(this.searchParams(s)).exec();
        return await this.convertAndReturnTheList(list);
    }

    async fetchOne(id: string | ObjectId): Promise<OUTPUT> {
        return this.toOutput((await this.m.findById(id)) as MODEL);
    }

    async create(input: INPUT): Promise<OUTPUT> {
        let newModel = new this.m();

        await this.moveIntoModel(newModel, input);

        await (newModel as HydratedDocument<MODEL, {}, unknown>).save();
        const out = await this.toOutput(newModel);
        await this.afterCreate(out);
        return out;
    }

    async edit(input: INPUT): Promise<OUTPUT> {
        const newModelFirst = await this.m.findById(input._id);

        const newModel = await this.moveIntoModel(
            newModelFirst as MODEL,
            input,
        );

        await (newModel as HydratedDocument<MODEL, {}, unknown>).save();

        return this.toOutput(newModel as MODEL);
    }

    async remove(id: string | ObjectId): Promise<OUTPUT> {
        let ac = await this.m.findById(id)!;
        await ac!.deleteOne();
        return this.toOutput(ac as MODEL);
    }

    async afterCreate(m: OUTPUT) {}
}

// return BaseCrudService;
