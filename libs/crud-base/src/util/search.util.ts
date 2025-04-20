import { RawSearchResult } from '@ubs-platform/crud-base-common';
import { Model, PipelineStage } from 'mongoose';

export class SearchUtil {
    /**
     *
     * @param model
     * @param size
     * @param page first page is zero
     * @param searchParamsQuery
     * @returns
     */
    static async modelSearch<OUTPUT>(
        model: Model<OUTPUT>,
        size: number | string,
        page: number | string,
        sort: { [key: string]: 1 | -1 | 'asc' | 'desc' },
        // sortByFieldName: string | null | undefined,
        // sortByType: 'desc' | 'asc' | '' | null | undefined,
        ...searchParamsQuery: any[]
    ) {
        //@ts-ignore
        size = parseInt(size) || 10;
        //@ts-ignore
        page = parseInt(page) || 0;

        // let sort;
        // if (sortByFieldName) {
        //     sort = { $sort: {} };
        //     sort['$sort'][sortByFieldName] = sortByType == 'asc' ? 1 : -1;
        // }
        const mongoPipe = [
            ...searchParamsQuery,
            {
                $facet: {
                    total: [{ $count: 'total' }],
                    data: [
                        // lack of convert to int
                        sort && Object.keys(sort).length > 0
                            ? { $sort: sort }
                            : null,
                        { $skip: (size || 10) * (page || 0) },
                        { $limit: parseInt(size as any as string) },
                    ].filter((a) => a),
                },
            },
        ];
        const results = await model.aggregate(mongoPipe);
        const maxItemLength = results[0].total[0]?.total || 0;
        const itemLengthThing = Math.ceil(maxItemLength / size);
        const maxPagesIndex = size ? itemLengthThing - 1 : 0;
        return new RawSearchResult<OUTPUT>(
            results[0]?.data || [],
            page,
            size,
            maxItemLength,
            maxPagesIndex,
            maxPagesIndex == page,
            page == 0,
        );
    }
}
