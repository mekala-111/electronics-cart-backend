import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TransactionContext } from '../../shared/context/transaction-context';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = request;
    const startedAt = Date.now();
    const tx = TransactionContext.get();
    const trace = tx
      ? ` corr=${tx.correlationId} req=${tx.requestId}${tx.workflowId ? ` wf=${tx.workflowId}` : ''}${tx.userId ? ` user=${tx.userId}` : ''}`
      : '';

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startedAt;
          this.logger.log(`${method} ${originalUrl} ${durationMs}ms${trace}`);
        },
        error: () => {
          const durationMs = Date.now() - startedAt;
          this.logger.warn(
            `${method} ${originalUrl} ${durationMs}ms (failed)${trace}`,
          );
        },
      }),
    );
  }
}
