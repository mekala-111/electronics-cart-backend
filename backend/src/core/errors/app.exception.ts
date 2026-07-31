import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode | string,
    message: string,
    status: HttpStatus,
    public readonly errors: Record<string, unknown>[] = [],
  ) {
    super({ code, message, errors }, status);
  }
}
