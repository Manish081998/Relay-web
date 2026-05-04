/** Generic wrapper for all successful API responses */
export interface ApiResult<T> {
  data:     T;
  message?: string;
}

/** Paginated list response */
export interface PagedResult<T> {
  items:    T[];
  total:    number;
  page:     number;
  pageSize: number;
}

/** Structured error returned from the API */
export interface ApiError {
  code:     string;
  message:  string;
  details?: string[];
}

/** Discriminated union: call succeeded or failed */
export type ApiResponse<T> =
  | { ok: true;  data: T }
  | { ok: false; error: ApiError };
