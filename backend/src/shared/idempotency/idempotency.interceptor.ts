import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { AuthUser } from '../../common/types/auth-user.type';
import { AppException } from '../../core/errors/app.exception';
import { ErrorCodes } from '../../core/errors/error-codes';
import {
  IDEMPOTENCY_DEFAULT_TTL_SECONDS,
  IDEMPOTENCY_HEADER,
  IDEMPOTENCY_META_KEY,
} from './idempotency.constants';
import { IdempotentOptions } from './idempotent.decorator';
import { IdempotencyService } from './idempotency.service';

type AuthedRequest = Request & { user?: AuthUser };

type PrepareResult =
  | { kind: 'passthrough' }
  | { kind: 'replay'; statusCode: number; body: unknown }
  | { kind: 'execute'; scope: string; key: string; fingerprint: string; ttlSeconds: number };

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly idempotency: IdempotencyService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.getAllAndOverride<IdempotentOptions | undefined>(
      IDEMPOTENCY_META_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<AuthedRequest>();
    const response = http.getResponse<Response>();
    const method = request.method.toUpperCase();

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    return from(this.prepare(request, options)).pipe(
      mergeMap((prepared) => {
        if (prepared.kind === 'passthrough') {
          return next.handle();
        }

        if (prepared.kind === 'replay') {
          response.status(prepared.statusCode || 200);
          return of(prepared.body);
        }

        const { scope, key, fingerprint, ttlSeconds } = prepared;

        return next.handle().pipe(
          mergeMap(async (body) => {
            await this.idempotency.complete(
              scope,
              key,
              fingerprint,
              response.statusCode || 200,
              body,
              ttlSeconds,
            );
            return body;
          }),
          catchError((err) => {
            void this.idempotency.clear(scope, key);
            return throwError(() => err);
          }),
        );
      }),
    );
  }

  private async prepare(
    request: AuthedRequest,
    options: IdempotentOptions,
  ): Promise<PrepareResult> {
    const rawKey = request.headers[IDEMPOTENCY_HEADER];
    const key = typeof rawKey === 'string' ? rawKey.trim() : '';
    const required = options.required !== false;
    const ttlSeconds = options.ttlSeconds ?? IDEMPOTENCY_DEFAULT_TTL_SECONDS;

    if (!key) {
      if (required) {
        throw new AppException(
          ErrorCodes.IDEMPOTENCY_KEY_REQUIRED,
          'Idempotency-Key header is required for this operation',
          400,
        );
      }
      return { kind: 'passthrough' };
    }

    if (key.length < 8 || key.length > 128) {
      throw new AppException(
        ErrorCodes.IDEMPOTENCY_KEY_REQUIRED,
        'Idempotency-Key must be 8–128 characters',
        400,
      );
    }

    const scope = this.scope(request);
    const fingerprint = this.idempotency.fingerprint(
      request.method.toUpperCase(),
      request.originalUrl ?? request.url,
      request.body,
    );

    const existing = await this.idempotency.get(scope, key);

    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        throw new AppException(
          ErrorCodes.IDEMPOTENCY_KEY_CONFLICT,
          'Idempotency-Key was reused with a different request payload',
          409,
        );
      }

      if (existing.status === 'processing') {
        throw new AppException(
          ErrorCodes.IDEMPOTENCY_IN_PROGRESS,
          'A request with this Idempotency-Key is still processing',
          409,
        );
      }

      return {
        kind: 'replay',
        statusCode: existing.statusCode || 200,
        body: existing.body,
      };
    }

    const claimed = await this.idempotency.begin(
      scope,
      key,
      fingerprint,
      ttlSeconds,
    );

    if (!claimed) {
      const raced = await this.idempotency.get(scope, key);
      if (raced?.status === 'completed' && raced.fingerprint === fingerprint) {
        return {
          kind: 'replay',
          statusCode: raced.statusCode || 200,
          body: raced.body,
        };
      }
      throw new AppException(
        ErrorCodes.IDEMPOTENCY_IN_PROGRESS,
        'A request with this Idempotency-Key is still processing',
        409,
      );
    }

    return { kind: 'execute', scope, key, fingerprint, ttlSeconds };
  }

  private scope(request: AuthedRequest): string {
    const userId = request.user?.sub ?? 'anon';
    const route = `${request.method}:${request.route?.path ?? request.path}`;
    return `${userId}:${route}`;
  }
}
