export interface ResponseMeta {
  [key: string]: unknown;
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ErrorResponse {
  success: false;
  code: string;
  message: string;
  errors: Record<string, unknown>[];
  requestId?: string;
  correlationId?: string;
}

export interface PaginatedPayload<T> {
  data: T;
  meta: ResponseMeta;
}

export function isSuccessResponse<T>(
  value: unknown,
): value is SuccessResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    (value as SuccessResponse<T>).success === true
  );
}

export function isPaginatedPayload<T>(
  value: unknown,
): value is PaginatedPayload<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value
  );
}
