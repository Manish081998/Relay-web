export type SortDir = 'asc' | 'desc';

export interface PaginationParams {
  page:      number;
  pageSize:  number;
  sortBy?:   string;
  sortDir?:  SortDir;
  search?:   string;
}

export const DEFAULT_PAGINATION: PaginationParams = {
  page:     1,
  pageSize: 20,
  sortDir:  'asc',
};
