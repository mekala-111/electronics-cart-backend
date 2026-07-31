import { Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { InventoryService } from '../../inventory/services/inventory.service';
import { LockService } from '../../../shared/lock/lock.service';
import { SagaCoordinator } from '../../../shared/workflow/saga-coordinator.service';
import { WorkflowDefinition } from '../../../shared/workflow/workflow.types';
import { CheckoutDto } from '../dto/checkout.dto';
import {
  OrderConfirmedEvent,
  OrderCreatedEvent,
} from '../events/orders.events';
import { OrdersEventPublisher } from '../events/orders-event.publisher';
import { CheckoutContext } from '../interfaces';
import { mapOrderSummary } from '../mappers/orders.mapper';
import { CartRepository } from '../repositories/cart.repository';
import { FulfillmentRepository } from '../repositories/fulfillment.repository';
import { OrderRepository } from '../repositories/order.repository';
import { nextOrderNumber } from '../validators/order-state.validator';
import { PaymentsService } from '../../payments/services/payments.service';
import { CartService } from './cart.service';
import { OrdersCacheService } from './orders-cache.service';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly carts: CartService,
    private readonly cartRepo: CartRepository,
    private readonly orders: OrderRepository,
    private readonly fulfillment: FulfillmentRepository,
    private readonly inventory: InventoryService,
    private readonly payments: PaymentsService,
    private readonly sagas: SagaCoordinator,
    private readonly locks: LockService,
    private readonly events: OrdersEventPublisher,
    private readonly cache: OrdersCacheService,
  ) {}

  async checkout(userId: string, dto: CheckoutDto) {
    return this.locks.withLock(
      LockService.resourceKey('orders', 'checkout', userId),
      async () => {
        const cart = dto.cartId
          ? await this.carts.requireCart(dto.cartId, userId)
          : await this.cartRepo.findActiveByUser(userId);

        if (!cart || !cart.items.length) {
          throw new AppException(ErrorCodes.BAD_REQUEST, 'Cart is empty', 400);
        }

        await this.validateTenders(userId, dto);

        const amount = cart.items.reduce(
          (s, i) => s + Number(i.unit_price) * i.quantity,
          0,
        );

        const ctx: CheckoutContext = {
          userId,
          cartId: cart.id,
          warehouseId: dto.warehouseId,
          amount,
          shipping: {
            fullName: dto.shipping.fullName,
            phone: dto.shipping.phone,
            line1: dto.shipping.line1,
            line2: dto.shipping.line2,
            city: dto.shipping.city,
            state: dto.shipping.state,
            country: dto.shipping.country ?? 'India',
            postalCode: dto.shipping.postalCode,
            gstin: dto.shipping.gstin,
          },
          billing: dto.billing
            ? {
                fullName: dto.billing.fullName,
                phone: dto.billing.phone,
                line1: dto.billing.line1,
                line2: dto.billing.line2,
                city: dto.billing.city,
                state: dto.billing.state,
                country: dto.billing.country ?? 'India',
                postalCode: dto.billing.postalCode,
                gstin: dto.billing.gstin,
              }
            : undefined,
          giftCardCode: dto.giftCardCode,
          walletAmount: dto.walletAmount,
          reservationIds: [],
        };

        const definition = this.buildDefinition(cart);
        const result = await this.sagas.run(definition, ctx);

        if (result.status !== 'completed') {
          throw new AppException(
            ErrorCodes.CONFLICT,
            result.error ?? 'Checkout workflow failed',
            409,
          );
        }

        const order = await this.orders.findById(result.context.orderId!);
        await this.cache.invalidateCart(`user:${userId}`);
        if (order) await this.cache.invalidateOrder(order.id, userId);

        return {
          workflowId: result.id,
          order: order ? mapOrderSummary(order) : null,
          paymentId: result.context.paymentId,
          reservationIds: result.context.reservationIds,
        };
      },
      { ttlMs: 60_000, waitMs: 10_000 },
    );
  }

  private async validateTenders(userId: string, dto: CheckoutDto) {
    if (dto.giftCardCode) {
      const gc = await this.fulfillment.findGiftCard(dto.giftCardCode);
      if (!gc || Number(gc.remaining_balance) <= 0) {
        throw new AppException(ErrorCodes.BAD_REQUEST, 'Invalid gift card', 400);
      }
    }
    if (dto.walletAmount && dto.walletAmount > 0) {
      const wallet = await this.fulfillment.findWallet(userId);
      if (!wallet || Number(wallet.balance) < dto.walletAmount) {
        throw new AppException(
          ErrorCodes.BAD_REQUEST,
          'Insufficient wallet balance',
          400,
        );
      }
    }
  }

  private buildDefinition(
    cart: Awaited<ReturnType<CartRepository['findById']>>,
  ): WorkflowDefinition<CheckoutContext> {
    if (!cart) throw new AppException(ErrorCodes.NOT_FOUND, 'Cart not found', 404);

    return {
      name: 'order.placement',
      timeoutMs: 120_000,
      retry: { maxAttempts: 1 },
      steps: [
        {
          name: 'create_draft_order',
          timeoutMs: 15_000,
          execute: async (ctx) => {
            const orderNumber = nextOrderNumber();
            const order = await this.orders.client.order.create({
              data: {
                order_number: orderNumber,
                customer_id: ctx.userId,
                cart_id: ctx.cartId,
                fulfillment_warehouse_id: ctx.warehouseId,
                currency: cart.currency,
                subtotal: ctx.amount ?? 0,
                grand_total: ctx.amount ?? 0,
                status: 'pending',
                created_by: ctx.userId,
                updated_by: ctx.userId,
                items: {
                  create: cart.items.map((i) => ({
                    variant_id: i.variant_id,
                    product_name_snapshot: i.variant.sku,
                    sku_snapshot: i.variant.sku,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    line_total: Number(i.unit_price) * i.quantity,
                    created_by: ctx.userId,
                    updated_by: ctx.userId,
                  })),
                },
                addresses: {
                  create: [
                    {
                      address_type: 'shipping',
                      full_name: ctx.shipping!.fullName,
                      phone: ctx.shipping!.phone,
                      line1: ctx.shipping!.line1,
                      line2: ctx.shipping!.line2,
                      city: ctx.shipping!.city,
                      state: ctx.shipping!.state,
                      country: ctx.shipping!.country ?? 'India',
                      postal_code: ctx.shipping!.postalCode,
                      gstin: ctx.shipping!.gstin,
                      created_by: ctx.userId,
                      updated_by: ctx.userId,
                    },
                    {
                      address_type: 'billing',
                      full_name: (ctx.billing ?? ctx.shipping)!.fullName,
                      phone: (ctx.billing ?? ctx.shipping)!.phone,
                      line1: (ctx.billing ?? ctx.shipping)!.line1,
                      line2: (ctx.billing ?? ctx.shipping)!.line2,
                      city: (ctx.billing ?? ctx.shipping)!.city,
                      state: (ctx.billing ?? ctx.shipping)!.state,
                      country: (ctx.billing ?? ctx.shipping)!.country ?? 'India',
                      postal_code: (ctx.billing ?? ctx.shipping)!.postalCode,
                      gstin: (ctx.billing ?? ctx.shipping)!.gstin,
                      created_by: ctx.userId,
                      updated_by: ctx.userId,
                    },
                  ],
                },
                status_history: {
                  create: {
                    to_status: 'pending',
                    note: 'Draft order created',
                    created_by: ctx.userId,
                    updated_by: ctx.userId,
                  },
                },
              },
            });

            this.events.created(
              new OrderCreatedEvent({
                orderId: order.id,
                orderNumber: order.order_number,
                customerId: ctx.userId,
              }),
            );

            return { orderId: order.id, orderNumber: order.order_number };
          },
          compensate: async (ctx) => {
            if (!ctx.orderId) return;
            await this.orders.transitionStatus(
              ctx.orderId,
              'pending',
              'cancelled',
              'Checkout compensation',
              ctx.userId,
            );
          },
        },
        {
          name: 'reserve_inventory',
          timeoutMs: 30_000,
          execute: async (ctx) => {
            const reservationIds: string[] = [];
            for (const item of cart.items) {
              const res = await this.inventory.reserve(
                {
                  warehouseId: ctx.warehouseId,
                  variantId: item.variant_id,
                  quantity: item.quantity,
                  cartId: ctx.cartId,
                  orderId: ctx.orderId,
                },
                ctx.userId,
              );
              reservationIds.push(res.id);
            }
            // link reservations to order
            await this.orders.client.stockReservation.updateMany({
              where: { id: { in: reservationIds } },
              data: { order_id: ctx.orderId },
            });
            return { reservationIds };
          },
          compensate: async (ctx) => {
            for (const id of ctx.reservationIds ?? []) {
              try {
                await this.inventory.releaseReservation(id, ctx.userId);
              } catch (err) {
                this.logger.warn(`release ${id} failed: ${String(err)}`);
              }
            }
          },
        },
        {
          name: 'create_payment',
          timeoutMs: 20_000,
          retry: { maxAttempts: 2, delayMs: 200 },
          execute: async (ctx) => {
            if ((ctx.amount ?? 0) < 0) {
              throw new Error('Invalid payment amount');
            }
            const payment = await this.payments.createForCheckout({
              orderId: ctx.orderId!,
              userId: ctx.userId,
              amount: ctx.amount ?? 0,
            });
            return { paymentId: payment.id };
          },
          compensate: async (ctx) => {
            if (!ctx.paymentId) return;
            await this.payments.voidOrCancel(ctx.paymentId, ctx.userId);
          },
        },
        {
          name: 'authorize_payment',
          timeoutMs: 30_000,
          retry: { maxAttempts: 2, delayMs: 200 },
          execute: async (ctx) => {
            await this.payments.authorize(ctx.paymentId!, ctx.userId);
            return {};
          },
          compensate: async (ctx) => {
            if (!ctx.paymentId) return;
            await this.payments.voidOrCancel(ctx.paymentId, ctx.userId);
          },
        },
        {
          name: 'capture_payment',
          timeoutMs: 30_000,
          retry: { maxAttempts: 2, delayMs: 200 },
          execute: async (ctx) => {
            await this.payments.capture(ctx.paymentId!, ctx.userId);
            return {};
          },
          compensate: async (ctx) => {
            if (!ctx.paymentId) return;
            try {
              await this.payments.voidOrCancel(ctx.paymentId, ctx.userId);
            } catch {
              // captured → refund path left to admin if void fails
              this.logger.warn(`capture compensate failed for ${ctx.paymentId}`);
            }
          },
        },
        {
          name: 'confirm_order',
          timeoutMs: 15_000,
          execute: async (ctx) => {
            if (!ctx.reservationIds?.length) {
              throw new Error('Inventory reservation required before confirmation');
            }
            await this.orders.transitionStatus(
              ctx.orderId!,
              'pending',
              'confirmed',
              'Payment captured',
              ctx.userId,
            );
            await this.cartRepo.markConverted(ctx.cartId);
            await this.fulfillment.createRiskScore(ctx.orderId!, 10, 'low');

            this.events.confirmed(
              new OrderConfirmedEvent({
                orderId: ctx.orderId!,
                orderNumber: ctx.orderNumber!,
              }),
            );
            return {};
          },
          compensate: async (ctx) => {
            if (!ctx.orderId) return;
            await this.orders.transitionStatus(
              ctx.orderId,
              'confirmed',
              'cancelled',
              'Confirm compensation',
              ctx.userId,
            );
          },
        },
      ],
    };
  }
}
