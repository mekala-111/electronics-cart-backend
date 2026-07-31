import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Request, Response } from 'express';
import { mapPrismaKnownRequestError } from '../../core/errors/prisma-exception.mapper';
import { ErrorResponse } from '../../core/response/api-response';

@Catch(PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    exception: PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const mapped = mapPrismaKnownRequestError(exception);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.headers['x-request-id'] as string | undefined;

    const body: ErrorResponse = {
      success: false,
      code: mapped.code,
      message: mapped.message,
      errors: mapped.errors,
      ...(requestId ? { requestId } : {}),
    };

    response.status(mapped.getStatus()).json(body);
  }
}
