import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException } from '../../core/errors/app.exception';
import { ErrorCodes } from '../../core/errors/error-codes';
import { ErrorResponse } from '../../core/response/api-response';
import { TransactionContext } from '../../shared/context/transaction-context';

function hideDetails(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.HIDE_ERROR_DETAILS === 'true'
  );
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let code: string = ErrorCodes.HTTP_ERROR;
    let message = exception.message;
    let errors: Record<string, unknown>[] = [];

    if (exception instanceof AppException) {
      code = exception.code;
      errors = exception.errors;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const payload = exceptionResponse as Record<string, unknown>;

      if (typeof payload.code === 'string') {
        code = payload.code;
      }

      if (typeof payload.message === 'string') {
        message = payload.message;
      } else if (Array.isArray(payload.message)) {
        message = payload.message.map(String).join(', ');
      }

      if (Array.isArray(payload.errors)) {
        errors = payload.errors as Record<string, unknown>[];
      }
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    }

    if (hideDetails() && status >= 500) {
      message = 'Internal server error';
      errors = [];
      code = ErrorCodes.INTERNAL_ERROR;
    }

    const requestId =
      TransactionContext.get()?.requestId ??
      (request.headers['x-request-id'] as string | undefined);
    const correlationId = TransactionContext.get()?.correlationId;

    const body: ErrorResponse = {
      success: false,
      code,
      message,
      errors: hideDetails() && status >= 500 ? [] : errors,
      ...(requestId ? { requestId } : {}),
      ...(correlationId ? { correlationId } : {}),
    };

    response.status(status).json(body);
  }
}
