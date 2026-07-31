/**
 * Example order-placement saga definition (Orders module will supply real handlers).
 * Kept here as a reusable contract so Inventory/Payment stay unaware of each other.
 */
import { WorkflowDefinition } from '../workflow.types';

export interface OrderPlacementContext {
  cartId?: string;
  userId?: string;
  warehouseId?: string;
  orderId?: string;
  reservationId?: string;
  paymentId?: string;
  amount?: number;
  [key: string]: unknown;
}

/**
 * Template only — execute/compensate are no-ops until Orders wires real services.
 */
export function orderPlacementDefinition(
  handlers: {
    reserveInventory: (ctx: OrderPlacementContext) => Promise<Partial<OrderPlacementContext>>;
    releaseInventory: (ctx: OrderPlacementContext) => Promise<void>;
    initiatePayment: (ctx: OrderPlacementContext) => Promise<Partial<OrderPlacementContext>>;
    voidPayment: (ctx: OrderPlacementContext) => Promise<void>;
    confirmOrder: (ctx: OrderPlacementContext) => Promise<Partial<OrderPlacementContext>>;
    cancelOrder: (ctx: OrderPlacementContext) => Promise<void>;
  },
): WorkflowDefinition<OrderPlacementContext> {
  return {
    name: 'order.placement',
    timeoutMs: 120_000,
    retry: { maxAttempts: 2, delayMs: 200, backoffFactor: 2 },
    steps: [
      {
        name: 'reserve_inventory',
        timeoutMs: 15_000,
        execute: (ctx) => handlers.reserveInventory(ctx),
        compensate: (ctx) => handlers.releaseInventory(ctx),
      },
      {
        name: 'initiate_payment',
        timeoutMs: 30_000,
        retry: { maxAttempts: 3, delayMs: 300 },
        execute: (ctx) => handlers.initiatePayment(ctx),
        compensate: (ctx) => handlers.voidPayment(ctx),
      },
      {
        name: 'confirm_order',
        timeoutMs: 15_000,
        execute: (ctx) => handlers.confirmOrder(ctx),
        compensate: (ctx) => handlers.cancelOrder(ctx),
      },
    ],
  };
}
