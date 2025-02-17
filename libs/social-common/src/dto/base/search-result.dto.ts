export interface SearchResult<OUTPUT> {
  content: OUTPUT[];
  page: number;
  size: number;
  maxItemLength: number;
  maxPagesIndex: number;
  lastPage: boolean;
  firstPage: boolean;
}
