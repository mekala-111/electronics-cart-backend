import { DomainEvent } from '../../../shared/events/domain-event';

export class BrandCreatedEvent extends DomainEvent<{
  brandId: string;
  slug: string;
}> {
  static readonly eventName = 'catalog.brand.created';
  readonly eventName = BrandCreatedEvent.eventName;

  constructor(brandId: string, slug: string) {
    super({ brandId, slug });
  }
}

export class CategoryCreatedEvent extends DomainEvent<{
  categoryId: string;
  slug: string;
}> {
  static readonly eventName = 'catalog.category.created';
  readonly eventName = CategoryCreatedEvent.eventName;

  constructor(categoryId: string, slug: string) {
    super({ categoryId, slug });
  }
}

export class ProductCreatedEvent extends DomainEvent<{
  productId: string;
  slug: string;
}> {
  static readonly eventName = 'catalog.product.created';
  readonly eventName = ProductCreatedEvent.eventName;

  constructor(productId: string, slug: string) {
    super({ productId, slug });
  }
}

export class VariantCreatedEvent extends DomainEvent<{
  variantId: string;
  productId: string;
  sku: string;
}> {
  static readonly eventName = 'catalog.variant.created';
  readonly eventName = VariantCreatedEvent.eventName;

  constructor(variantId: string, productId: string, sku: string) {
    super({ variantId, productId, sku });
  }
}

export class ProductUpdatedEvent extends DomainEvent<{
  productId: string;
  slug: string;
}> {
  static readonly eventName = 'catalog.product.updated';
  readonly eventName = ProductUpdatedEvent.eventName;

  constructor(productId: string, slug: string) {
    super({ productId, slug });
  }
}

export class ProductDeletedEvent extends DomainEvent<{
  productId: string;
  slug: string;
}> {
  static readonly eventName = 'catalog.product.deleted';
  readonly eventName = ProductDeletedEvent.eventName;

  constructor(productId: string, slug: string) {
    super({ productId, slug });
  }
}

/** Reserved names for future modules (contracts only). */
export const FutureDomainEvents = {
  InventoryReserved: 'inventory.reserved',
  OrderPlaced: 'order.placed',
  PaymentSucceeded: 'payment.succeeded',
  ShipmentDelivered: 'shipping.delivered',
  WarrantyRegistered: 'warranty.registered',
} as const;
