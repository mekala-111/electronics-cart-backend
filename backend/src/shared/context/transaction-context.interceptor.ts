import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthUser } from '../../common/types/auth-user.type';
import { TransactionContext } from './transaction-context';

type AuthedRequest = { user?: AuthUser };

/**
 * After guards: attach userId / sessionId to the active transaction context.
 */
@Injectable()
export class TransactionContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const user = request.user;
    if (user?.sub) {
      TransactionContext.patch({
        userId: user.sub,
        sessionId: user.sessionId,
      });
    }
    return next.handle();
  }
}
