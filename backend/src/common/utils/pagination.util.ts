export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationQueryInput {
  page?: number | string;
  limit?: number | string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function toPositiveInt(value: number | string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function parsePaginationQuery(
  input: PaginationQueryInput = {},
): PaginationParams {
  const page = toPositiveInt(input.page, DEFAULT_PAGE);
  const limit = Math.min(
    toPositiveInt(input.limit, DEFAULT_LIMIT),
    MAX_LIMIT,
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function paginatedResult<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
): { data: T[]; meta: PaginationMeta } {
  return {
    data: items,
    meta: buildPaginationMeta(page, limit, total),
  };
}
