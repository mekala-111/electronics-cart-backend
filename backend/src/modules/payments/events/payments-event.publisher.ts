import { Injectable } from '@nestjs/common';
import { EventPublisher } from '../../../shared/events/event-publisher';
import {
  PaymentAuthorizedEvent,
  PaymentCancelledEvent,
  PaymentCapturedEvent,
  PaymentCreatedEvent,
  PaymentDisputeCreatedEvent,
  PaymentFailedEvent,
  PaymentPartiallyRefundedEvent,
  PaymentPendingEvent,
  PaymentRefundedEvent,
  PaymentSettlementCompletedEvent,
  PaymentWebhookProcessedEvent,
  PaymentWebhookReceivedEvent,
} from './payment.events';

@Injectable()
export class PaymentsEventPublisher {
  constructor(private readonly publisher: EventPublisher) {}

  created(e: PaymentCreatedEvent) {
    void this.publisher.publish(e);
  }
  pending(e: PaymentPendingEvent) {
    void this.publisher.publish(e);
  }
  authorized(e: PaymentAuthorizedEvent) {
    void this.publisher.publish(e);
  }
  captured(e: PaymentCapturedEvent) {
    void this.publisher.publish(e);
  }
  failed(e: PaymentFailedEvent) {
    void this.publisher.publish(e);
  }
  cancelled(e: PaymentCancelledEvent) {
    void this.publisher.publish(e);
  }
  refunded(e: PaymentRefundedEvent) {
    void this.publisher.publish(e);
  }
  partiallyRefunded(e: PaymentPartiallyRefundedEvent) {
    void this.publisher.publish(e);
  }
  webhookReceived(e: PaymentWebhookReceivedEvent) {
    void this.publisher.publish(e);
  }
  webhookProcessed(e: PaymentWebhookProcessedEvent) {
    void this.publisher.publish(e);
  }
  disputeCreated(e: PaymentDisputeCreatedEvent) {
    void this.publisher.publish(e);
  }
  settlementCompleted(e: PaymentSettlementCompletedEvent) {
    void this.publisher.publish(e);
  }
}
