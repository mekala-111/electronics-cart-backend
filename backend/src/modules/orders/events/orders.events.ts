import { DomainEvent } from '../../../shared/events/domain-event';

export class OrderCreatedEvent extends DomainEvent<{
  orderId: string;
  orderNumber: string;
  customerId: string;
}> {
  static readonly eventName = 'order.created';
  readonly eventName = OrderCreatedEvent.eventName;
}

export class OrderConfirmedEvent extends DomainEvent<{
  orderId: string;
  orderNumber: string;
}> {
  static readonly eventName = 'order.confirmed';
  readonly eventName = OrderConfirmedEvent.eventName;
}

export class OrderCancelledEvent extends DomainEvent<{
  orderId: string;
  orderNumber: string;
  reasonId?: string;
}> {
  static readonly eventName = 'order.cancelled';
  readonly eventName = OrderCancelledEvent.eventName;
}

export class OrderReturnRequestedEvent extends DomainEvent<{
  returnId: string;
  orderId: string;
  returnNumber: string;
}> {
  static readonly eventName = 'order.return_requested';
  readonly eventName = OrderReturnRequestedEvent.eventName;
}

export class OrderExchangeRequestedEvent extends DomainEvent<{
  exchangeId: string;
  orderId: string;
  exchangeNumber: string;
}> {
  static readonly eventName = 'order.exchange_requested';
  readonly eventName = OrderExchangeRequestedEvent.eventName;
}

export class OrderFulfillmentCreatedEvent extends DomainEvent<{
  fulfillmentId: string;
  orderId: string;
  fulfillmentNumber: string;
}> {
  static readonly eventName = 'order.fulfillment_created';
  readonly eventName = OrderFulfillmentCreatedEvent.eventName;
}
