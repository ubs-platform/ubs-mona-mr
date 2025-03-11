export interface SearchResult<OUTPUT> {
    content: OUTPUT[];
    page: number;
    size: number;
    maxItemLength: number;
    maxPagesIndex: number;
    lastPage: boolean;
    firstPage: boolean;
}

export class RawSearchResult<OUTPUT> implements SearchResult<OUTPUT> {
    constructor(
        public content: OUTPUT[],
        public page: number,
        public size: number,
        public maxItemLength: number,
        public maxPagesIndex: number,
        public lastPage: boolean,
        public firstPage: boolean,
    ) {}
    map<TARGET = any>(cb: (outArray: OUTPUT, index: number) => TARGET) {
        return new RawSearchResult(
            this.content.map((item, index) => cb(item, index)),
            this.page,
            this.size,
            this.maxItemLength,
            this.maxPagesIndex,
            this.lastPage,
            this.firstPage,
        );
    }

    async mapAsync<TARGET = any>(
        cb: (outArray: OUTPUT, index: number) => TARGET | PromiseLike<TARGET>,
    ) {
        let newContent: TARGET[] = [];
        for (let index = 0; index < this.content.length; index++) {
            const element = this.content[index];
            newContent.push(await cb(element, index));
        }
        return new RawSearchResult(
            newContent,
            this.page,
            this.size,
            this.maxItemLength,
            this.maxPagesIndex,
            this.lastPage,
            this.firstPage,
        );
    }
}
