import { Injectable } from '@nestjs/common';
import { EventPublisher } from '../../../shared/events/event-publisher';
import {
  OrderCancelledEvent,
  OrderConfirmedEvent,
  OrderCreatedEvent,
  OrderExchangeRequestedEvent,
  OrderFulfillmentCreatedEvent,
  OrderReturnRequestedEvent,
} from './orders.events';

@Injectable()
export class OrdersEventPublisher {
  constructor(private readonly publisher: EventPublisher) {}

  created(e: OrderCreatedEvent) {
    void this.publisher.publish(e);
  }
  confirmed(e: OrderConfirmedEvent) {
    void this.publisher.publish(e);
  }
  cancelled(e: OrderCancelledEvent) {
    void this.publisher.publish(e);
  }
  returnRequested(e: OrderReturnRequestedEvent) {
    void this.publisher.publish(e);
  }
  exchangeRequested(e: OrderExchangeRequestedEvent) {
    void this.publisher.publish(e);
  }
  fulfillmentCreated(e: OrderFulfillmentCreatedEvent) {
    void this.publisher.publish(e);
  }
}
