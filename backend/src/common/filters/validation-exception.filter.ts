import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCodes } from '../../core/errors/error-codes';
import { ErrorResponse } from '../../core/response/api-response';

interface ValidationErrorItem {
  property?: string;
  constraints?: Record<string, string>;
  children?: ValidationErrorItem[];
}

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const exceptionResponse = exception.getResponse();
    const requestId = request.headers['x-request-id'] as string | undefined;

    let message = 'Validation failed';
    let errors: Record<string, unknown>[] = [];

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const payload = exceptionResponse as Record<string, unknown>;

      if (Array.isArray(payload.message)) {
        if (this.looksLikeClassValidatorErrors(payload.message)) {
          errors = this.flattenValidationErrors(
            payload.message as ValidationErrorItem[],
          );
          message = 'Validation failed';
        } else {
          errors = payload.message.map((item) => ({ message: String(item) }));
          message = errors.map((item) => String(item.message)).join(', ');
        }
      } else if (typeof payload.message === 'string') {
        message = payload.message;
      }
    }

    const body: ErrorResponse = {
      success: false,
      code: ErrorCodes.VALIDATION_ERROR,
      message,
      errors,
      ...(requestId ? { requestId } : {}),
    };

    response.status(exception.getStatus()).json(body);
  }

  private looksLikeClassValidatorErrors(
    value: unknown[],
  ): value is ValidationErrorItem[] {
    return value.some(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        ('property' in item || 'constraints' in item || 'children' in item),
    );
  }

  private flattenValidationErrors(
    items: ValidationErrorItem[],
    parentPath = '',
  ): Record<string, unknown>[] {
    const normalized: Record<string, unknown>[] = [];

    for (const item of items) {
      const path = parentPath
        ? `${parentPath}.${item.property ?? ''}`
        : (item.property ?? '');

      if (item.constraints) {
        for (const [rule, detail] of Object.entries(item.constraints)) {
          normalized.push({
            field: path,
            rule,
            message: detail,
          });
        }
      }

      if (item.children?.length) {
        normalized.push(
          ...this.flattenValidationErrors(item.children, path),
        );
      }
    }

    return normalized;
  }
}
