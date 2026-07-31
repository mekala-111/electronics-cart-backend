import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { isPrismaKnownRequestError } from '../../core/errors/prisma-exception.mapper';
import { ErrorCodes } from '../../core/errors/error-codes';
import { ErrorResponse } from '../../core/response/api-response';
import { HttpExceptionFilter } from './http-exception.filter';
import { PrismaExceptionFilter } from './prisma-exception.filter';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly httpExceptionFilter = new HttpExceptionFilter();
  private readonly prismaExceptionFilter = new PrismaExceptionFilter();

  catch(exception: unknown, host: ArgumentsHost): void {
    if (exception instanceof HttpException) {
      this.httpExceptionFilter.catch(exception, host);
      return;
    }

    if (isPrismaKnownRequestError(exception)) {
      this.prismaExceptionFilter.catch(exception, host);
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.headers['x-request-id'] as string | undefined;

    this.logger.error(
      `Unhandled exception on ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : exception,
    );

    const body: ErrorResponse = {
      success: false,
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Internal server error',
      errors: [],
      ...(requestId ? { requestId } : {}),
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
