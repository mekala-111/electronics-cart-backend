import { NextFunction, Request, Response } from 'express';
import { generateUuid } from '../../common/utils/uuid.util';
import {
  TRANSACTION_HEADERS,
  TransactionContext,
} from './transaction-context';

function headerValue(
  headers: Request['headers'],
  name: string,
): string | undefined {
  const raw = headers[name];
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return undefined;
}

/**
 * Establishes AsyncLocalStorage context for the request.
 * Replaces bare request-id middleware — still sets response headers.
 */
export function transactionContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId =
    headerValue(req.headers, TRANSACTION_HEADERS.requestId) ?? generateUuid();
  const correlationId =
    headerValue(req.headers, TRANSACTION_HEADERS.correlationId) ?? requestId;
  const workflowId = headerValue(req.headers, TRANSACTION_HEADERS.workflowId);
  const tenantId = headerValue(req.headers, TRANSACTION_HEADERS.tenantId);

  req.headers[TRANSACTION_HEADERS.requestId] = requestId;
  req.headers[TRANSACTION_HEADERS.correlationId] = correlationId;
  res.setHeader(TRANSACTION_HEADERS.requestId, requestId);
  res.setHeader(TRANSACTION_HEADERS.correlationId, correlationId);
  if (workflowId) {
    res.setHeader(TRANSACTION_HEADERS.workflowId, workflowId);
  }

  TransactionContext.run(
    {
      correlationId,
      requestId,
      workflowId,
      tenantId,
    },
    () => next(),
  );
}
