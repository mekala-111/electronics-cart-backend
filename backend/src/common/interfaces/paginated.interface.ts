import { PaginationMeta } from '../utils/pagination.util';

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface CursorPaginatedResult<T, TCursor extends Record<string, unknown>> {
  items: T[];
  nextCursor: string | null;
  previousCursor: string | null;
  cursorMeta: TCursor;
}
