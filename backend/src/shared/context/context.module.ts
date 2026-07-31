import { Global, Module } from '@nestjs/common';
import { TransactionContextService } from './transaction-context.service';

@Global()
@Module({
  providers: [TransactionContextService],
  exports: [TransactionContextService],
})
export class TransactionContextModule {}
