import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { LockModule } from '../../shared/lock/lock.module';
import { AdminPaymentsController } from './controllers/admin-payments.controller';
import { PaymentsController } from './controllers/payments.controller';
import { PaymentsEventPublisher } from './events/payments-event.publisher';
import { PAYMENT_PROVIDER } from './interfaces/payment-provider.interface';
import { RazorpayProvider } from './providers/razorpay.provider';
import { PaymentRepository } from './repositories/payment.repository';
import { RefundRepository } from './repositories/refund.repository';
import { WebhookRepository } from './repositories/webhook.repository';
import { PaymentsBootstrapService } from './services/payments-bootstrap.service';
import { PaymentsCacheService } from './services/payments-cache.service';
import { PaymentsService } from './services/payments.service';
import { RefundService } from './services/refund.service';
import {
  DisputeService,
  ReconciliationService,
  SettlementService,
} from './services/settlement.service';
import { WebhookService } from './services/webhook.service';
import { PaymentsWorker } from './workers/payments.worker';

@Module({
  imports: [PrismaModule, CacheModule, LockModule],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [
    PaymentRepository,
    RefundRepository,
    WebhookRepository,
    PaymentsCacheService,
    PaymentsEventPublisher,
    RazorpayProvider,
    { provide: PAYMENT_PROVIDER, useExisting: RazorpayProvider },
    PaymentsService,
    RefundService,
    WebhookService,
    SettlementService,
    ReconciliationService,
    DisputeService,
    PaymentsBootstrapService,
    PaymentsWorker,
  ],
  exports: [PaymentsService, RefundService],
})
export class PaymentsModule {}
