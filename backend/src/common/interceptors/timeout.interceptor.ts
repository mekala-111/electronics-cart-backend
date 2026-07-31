import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

const DEFAULT_TIMEOUT_MS = 30_000;
/** Checkout / long workflows — must exceed saga budget (120s). */
export const LONG_TIMEOUT_MS = 150_000;
export const SKIP_TIMEOUT_KEY = 'skipTimeout';
export const TIMEOUT_MS_KEY = 'timeoutMs';

export const SkipTimeout = () => SetMetadata(SKIP_TIMEOUT_KEY, true);
export const TimeoutMs = (ms: number) => SetMetadata(TIMEOUT_MS_KEY, ms);

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TIMEOUT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return next.handle();
    }

    const override = this.reflector.getAllAndOverride<number>(TIMEOUT_MS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const ms = override ?? this.timeoutMs;

    return next.handle().pipe(
      timeout(ms),
      catchError((error: unknown) => {
        if (error instanceof TimeoutError) {
          return throwError(
            () => new RequestTimeoutException('Request timed out'),
          );
        }

        return throwError(() => error);
      }),
    );
  }
}
