import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  isPaginatedPayload,
  isSuccessResponse,
  SuccessResponse,
} from './api-response';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (isSuccessResponse<T>(data)) {
          return data;
        }

        if (isPaginatedPayload<T>(data)) {
          return {
            success: true as const,
            data: data.data,
            meta: data.meta,
          };
        }

        return {
          success: true as const,
          data,
        };
      }),
    );
  }
}
