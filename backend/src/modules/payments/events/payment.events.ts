import { DomainEvent } from '../../../shared/events/domain-event';

type PaymentPayload = {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  gateway?: string;
};

export class PaymentCreatedEvent extends DomainEvent<PaymentPayload> {
  static readonly eventName = 'payment.created';
  readonly eventName = PaymentCreatedEvent.eventName;
}

export class PaymentPendingEvent extends DomainEvent<PaymentPayload> {
  static readonly eventName = 'payment.pending';
  readonly eventName = PaymentPendingEvent.eventName;
}

export class PaymentAuthorizedEvent extends DomainEvent<PaymentPayload> {
  static readonly eventName = 'payment.authorized';
  readonly eventName = PaymentAuthorizedEvent.eventName;
}

export class PaymentCapturedEvent extends DomainEvent<PaymentPayload> {
  static readonly eventName = 'payment.captured';
  readonly eventName = PaymentCapturedEvent.eventName;
}

export class PaymentFailedEvent extends DomainEvent<PaymentPayload & { reason?: string }> {
  static readonly eventName = 'payment.failed';
  readonly eventName = PaymentFailedEvent.eventName;
}

export class PaymentCancelledEvent extends DomainEvent<PaymentPayload> {
  static readonly eventName = 'payment.cancelled';
  readonly eventName = PaymentCancelledEvent.eventName;
}

export class PaymentRefundedEvent extends DomainEvent<
  PaymentPayload & { refundId: string; refundAmount: number }
> {
  static readonly eventName = 'payment.refunded';
  readonly eventName = PaymentRefundedEvent.eventName;
}

export class PaymentPartiallyRefundedEvent extends DomainEvent<
  PaymentPayload & { refundId: string; refundAmount: number }
> {
  static readonly eventName = 'payment.partially_refunded';
  readonly eventName = PaymentPartiallyRefundedEvent.eventName;
}

export class PaymentWebhookReceivedEvent extends DomainEvent<{
  webhookId: string;
  gateway: string;
  eventType: string;
}> {
  static readonly eventName = 'payment.webhook.received';
  readonly eventName = PaymentWebhookReceivedEvent.eventName;
}

export class PaymentWebhookProcessedEvent extends DomainEvent<{
  webhookId: string;
  gateway: string;
  eventType: string;
  paymentId?: string;
}> {
  static readonly eventName = 'payment.webhook.processed';
  readonly eventName = PaymentWebhookProcessedEvent.eventName;
}

export class PaymentDisputeCreatedEvent extends DomainEvent<{
  disputeId: string;
  paymentId: string;
  orderId: string;
  amount: number;
}> {
  static readonly eventName = 'payment.dispute.created';
  readonly eventName = PaymentDisputeCreatedEvent.eventName;
}

export class PaymentSettlementCompletedEvent extends DomainEvent<{
  settlementId: string;
  settlementRef: string;
  receivedAmount: number;
  currency: string;
}> {
  static readonly eventName = 'payment.settlement.completed';
  readonly eventName = PaymentSettlementCompletedEvent.eventName;
}
