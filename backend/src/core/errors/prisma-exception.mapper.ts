import { HttpStatus } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AppException } from './app.exception';
import { ErrorCodes } from './error-codes';

const PRISMA_ERROR_MAP: Record<
  string,
  { status: HttpStatus; code: string; message: string }
> = {
  P2000: {
    status: HttpStatus.BAD_REQUEST,
    code: ErrorCodes.BAD_REQUEST,
    message: 'Value too long for column',
  },
  P2001: {
    status: HttpStatus.NOT_FOUND,
    code: ErrorCodes.NOT_FOUND,
    message: 'Record not found',
  },
  P2002: {
    status: HttpStatus.CONFLICT,
    code: ErrorCodes.CONFLICT,
    message: 'Unique constraint violation',
  },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    code: ErrorCodes.BAD_REQUEST,
    message: 'Foreign key constraint violation',
  },
  P2014: {
    status: HttpStatus.BAD_REQUEST,
    code: ErrorCodes.BAD_REQUEST,
    message: 'Invalid relation',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    code: ErrorCodes.NOT_FOUND,
    message: 'Record not found',
  },
};

export function mapPrismaKnownRequestError(
  error: PrismaClientKnownRequestError,
): AppException {
  const mapped = PRISMA_ERROR_MAP[error.code];

  if (mapped) {
    const meta = error.meta ?? {};
    const target = typeof meta.target === 'string' ? meta.target : undefined;

    return new AppException(
      mapped.code,
      target ? `${mapped.message}: ${target}` : mapped.message,
      mapped.status,
      [{ prismaCode: error.code, meta }],
    );
  }

  return new AppException(
    ErrorCodes.BAD_REQUEST,
    error.message,
    HttpStatus.BAD_REQUEST,
    [{ prismaCode: error.code, meta: error.meta ?? {} }],
  );
}

export function isPrismaKnownRequestError(
  error: unknown,
): error is PrismaClientKnownRequestError {
  return error instanceof PrismaClientKnownRequestError;
}
