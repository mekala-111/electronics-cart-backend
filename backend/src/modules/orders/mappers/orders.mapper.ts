import { Cart, CartItem, Order, OrderItem, ProductVariant } from '@prisma/client';

export function mapCart(
  cart: Cart & {
    items: (CartItem & { variant: ProductVariant | null })[];
  },
) {
  // Soft-deleted / missing variants must never 500 the cart read path
  const items = cart.items.filter((i) => !i.deleted_at && i.variant && !i.variant.deleted_at);
  const subtotal = items.reduce(
    (s, i) => s + Number(i.unit_price) * i.quantity,
    0,
  );
  return {
    id: cart.id,
    userId: cart.user_id,
    sessionKey: cart.session_key,
    currency: cart.currency,
    status: cart.status,
    subtotal,
    items: items.map((i) => ({
      id: i.id,
      variantId: i.variant_id,
      sku: i.variant!.sku,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
      lineTotal: Number(i.unit_price) * i.quantity,
    })),
  };
}

export function mapOrderSummary(
  order: Order & { items?: OrderItem[] },
) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    currency: order.currency,
    subtotal: Number(order.subtotal),
    discountTotal: Number(order.discount_total),
    taxTotal: Number(order.tax_total),
    shippingCharge: Number(order.shipping_charge),
    grandTotal: Number(order.grand_total),
    placedAt: order.placed_at,
    cancelledAt: order.cancelled_at,
    itemCount: order.items?.length ?? undefined,
  };
}
