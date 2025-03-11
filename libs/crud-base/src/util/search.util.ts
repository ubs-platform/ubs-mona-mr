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
        size: number,
        page: number,
        ...searchParamsQuery: any[]
    ) {
        const results = await model.aggregate([
            ...searchParamsQuery,
            {
                $facet: {
                    total: [{ $count: 'total' }],
                    data: [
                        // lack of convert to int
                        { $sort: { creationDate: -1 } },
                        { $skip: (size || 10) * (page || 0) },
                        { $limit: parseInt(size as any as string) },
                    ],
                },
            },
        ]);

        const maxItemLength = results[0].total[0].count;

        const itemLengthThing = Math.ceil(maxItemLength / size);
        const maxPagesIndex = size ? itemLengthThing - 1 : 0;
        return new RawSearchResult<OUTPUT>(
            results[0].data,
            page,
            size,
            maxItemLength,
            maxPagesIndex,
            maxPagesIndex <= page,
            page == 0,
        );
    }
}
