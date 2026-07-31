import { Injectable } from '@nestjs/common';
import { EventPublisher } from '../../../shared/events/event-publisher';
import {
  BrandCreatedEvent,
  CategoryCreatedEvent,
  ProductCreatedEvent,
  ProductDeletedEvent,
  ProductUpdatedEvent,
  VariantCreatedEvent,
} from './catalog.events';

@Injectable()
export class CatalogEventPublisher {
  constructor(private readonly publisher: EventPublisher) {}

  brandCreated(e: BrandCreatedEvent) {
    void this.publisher.publish(e);
  }

  categoryCreated(e: CategoryCreatedEvent) {
    void this.publisher.publish(e);
  }

  productCreated(e: ProductCreatedEvent) {
    void this.publisher.publish(e);
  }

  variantCreated(e: VariantCreatedEvent) {
    void this.publisher.publish(e);
  }

  productUpdated(e: ProductUpdatedEvent) {
    void this.publisher.publish(e);
  }

  productDeleted(e: ProductDeletedEvent) {
    void this.publisher.publish(e);
  }
}
