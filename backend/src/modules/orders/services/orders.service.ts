import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { paginatedResult } from '../../../common/utils/pagination.util';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { InventoryService } from '../../inventory/services/inventory.service';
import { LockService } from '../../../shared/lock/lock.service';
import { ORDERS_CACHE } from '../constants/orders.constants';
import {
  CancelOrderDto,
  CreateFulfillmentDto,
  ExchangeRequestDto,
  ReturnRequestDto,
} from '../dto/checkout.dto';
import {
  OrderCancelledEvent,
  OrderExchangeRequestedEvent,
  OrderFulfillmentCreatedEvent,
  OrderReturnRequestedEvent,
} from '../events/orders.events';
import { OrdersEventPublisher } from '../events/orders-event.publisher';
import { mapOrderSummary } from '../mappers/orders.mapper';
import { FulfillmentRepository } from '../repositories/fulfillment.repository';
import { OrderRepository } from '../repositories/order.repository';
import { WishlistRepository } from '../repositories/wishlist.repository';
import {
  canCancel,
  canRequestReturn,
  nextExchangeNumber,
  nextFulfillmentNumber,
  nextReturnNumber,
} from '../validators/order-state.validator';
import { OrdersCacheService } from './orders-cache.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly fulfillment: FulfillmentRepository,
    private readonly wishlists: WishlistRepository,
    private readonly inventory: InventoryService,
    private readonly locks: LockService,
    private readonly events: OrdersEventPublisher,
    private readonly cache: OrdersCacheService,
  ) {}

  getOrder(idOrNumber: string, customerId?: string) {
    return this.cache.getOrSet(ORDERS_CACHE.order(idOrNumber), async () => {
      const order = await this.orders.findByIdOrNumber(idOrNumber);
      if (!order) throw new AppException(ErrorCodes.NOT_FOUND, 'Order not found', 404);
      if (customerId && order.customer_id && order.customer_id !== customerId) {
        throw new AppException(ErrorCodes.FORBIDDEN, 'Order access denied', 403);
      }
      return {
        ...mapOrderSummary(order),
        items: order.items.map((i) => ({
          id: i.id,
          variantId: i.variant_id,
          sku: i.sku_snapshot,
          name: i.product_name_snapshot,
          quantity: i.quantity,
          unitPrice: Number(i.unit_price),
          lineTotal: Number(i.line_total),
        })),
        addresses: order.addresses.map((a) => ({
          id: a.id,
          type: a.address_type,
          fullName: a.full_name,
          phone: a.phone,
          line1: a.line1,
          line2: a.line2,
          city: a.city,
          state: a.state,
          country: a.country,
          postalCode: a.postal_code,
        })),
        statusHistory: order.status_history.map((h) => ({
          from: h.from_status,
          to: h.to_status,
          note: h.note,
          changedAt: h.changed_at,
        })),
      };
    });
  }

  async history(customerId: string) {
    return this.cache.getOrSet(ORDERS_CACHE.recent(customerId), async () => {
      const rows = await this.orders.listByCustomer(customerId);
      return rows.map(mapOrderSummary);
    });
  }

  async listAddresses(customerId: string) {
    // ponytail: no addresses table — reuse recent order_addresses as address book
    const rows = await this.orders.recentAddresses(customerId);
    const seen = new Set<string>();
    const unique = [];
    for (const a of rows) {
      const key = `${a.line1}|${a.postal_code}|${a.full_name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push({
        id: a.id,
        fullName: a.full_name,
        phone: a.phone,
        line1: a.line1,
        line2: a.line2,
        city: a.city,
        state: a.state,
        country: a.country,
        postalCode: a.postal_code,
        gstin: a.gstin,
      });
    }
    return unique;
  }

  async cancel(orderId: string, userId: string, dto: CancelOrderDto, isAdmin = false) {
    return this.locks.withLock(
      LockService.resourceKey('orders', orderId),
      async () => {
        const order = await this.orders.findById(orderId);
        if (!order) throw new AppException(ErrorCodes.NOT_FOUND, 'Order not found', 404);
        if (!isAdmin && order.customer_id !== userId) {
          throw new AppException(ErrorCodes.FORBIDDEN, 'Order access denied', 403);
        }
        if (!canCancel(order.status)) {
          throw new AppException(
            ErrorCodes.CONFLICT,
            `Cannot cancel order in status ${order.status}`,
            409,
          );
        }

        await this.orders.client.order.update({
          where: { id: orderId },
          data: {
            cancellation_reason_id: dto.cancellationReasonId,
          },
        });
        await this.orders.transitionStatus(
          orderId,
          order.status,
          'cancelled',
          dto.note ?? 'Cancelled by customer',
          userId,
        );

        const reservations = await this.orders.client.stockReservation.findMany({
          where: { order_id: orderId, status: 'active', deleted_at: null },
        });
        for (const r of reservations) {
          await this.inventory.releaseReservation(r.id, userId);
        }

        await this.cache.invalidateOrder(orderId, order.customer_id ?? undefined);
        this.events.cancelled(
          new OrderCancelledEvent({
            orderId,
            orderNumber: order.order_number,
            reasonId: dto.cancellationReasonId,
          }),
        );
        return { id: orderId, status: 'cancelled' };
      },
      { ttlMs: 15_000, waitMs: 5_000 },
    );
  }

  async requestReturn(userId: string, orderId: string, dto: ReturnRequestDto) {
    const order = await this.requireOwnedOrder(orderId, userId);
    if (!canRequestReturn(order.status)) {
      throw new AppException(
        ErrorCodes.CONFLICT,
        `Cannot return order in status ${order.status}`,
        409,
      );
    }
    const item = order.items.find((i) => i.id === dto.orderItemId);
    if (!item) throw new AppException(ErrorCodes.NOT_FOUND, 'Order item not found', 404);
    if (dto.quantity > item.quantity) {
      throw new AppException(ErrorCodes.BAD_REQUEST, 'Quantity exceeds ordered', 400);
    }

    const ret = await this.fulfillment.createReturn({
      returnNumber: nextReturnNumber(),
      orderId,
      reason: dto.reason,
      items: [
        {
          orderItemId: dto.orderItemId,
          quantity: dto.quantity,
          reason: dto.reason,
        },
      ],
      actorId: userId,
    });

    this.events.returnRequested(
      new OrderReturnRequestedEvent({
        returnId: ret.id,
        orderId,
        returnNumber: ret.return_number,
      }),
    );
    return ret;
  }

  async requestExchange(userId: string, orderId: string, dto: ExchangeRequestDto) {
    const order = await this.requireOwnedOrder(orderId, userId);
    const item = order.items.find((i) => i.id === dto.orderItemId);
    if (!item) throw new AppException(ErrorCodes.NOT_FOUND, 'Order item not found', 404);

    const exchange = await this.fulfillment.createExchange({
      exchangeNumber: nextExchangeNumber(),
      orderId,
      orderItemId: dto.orderItemId,
      exchangeType: dto.exchangeType as 'same_variant' | 'different_variant' | 'store_credit',
      fromVariantId: item.variant_id,
      toVariantId: dto.toVariantId,
      reason: dto.reason,
      actorId: userId,
    });

    this.events.exchangeRequested(
      new OrderExchangeRequestedEvent({
        exchangeId: exchange.id,
        orderId,
        exchangeNumber: exchange.exchange_number,
      }),
    );
    return exchange;
  }

  async createFulfillment(orderId: string, dto: CreateFulfillmentDto, actorId?: string) {
    return this.locks.withLock(
      LockService.resourceKey('orders', 'fulfill', orderId),
      async () => {
        const order = await this.orders.findById(orderId);
        if (!order) throw new AppException(ErrorCodes.NOT_FOUND, 'Order not found', 404);
        if (!['confirmed', 'processing', 'packed'].includes(order.status)) {
          throw new AppException(
            ErrorCodes.CONFLICT,
            `Cannot fulfill order in status ${order.status}`,
            409,
          );
        }

        const items = dto.orderItemIds?.length
          ? order.items.filter((i) => dto.orderItemIds!.includes(i.id))
          : order.items;

        const fo = await this.orders.client.fulfillmentOrder.create({
          data: {
            fulfillment_number: nextFulfillmentNumber(),
            order_id: orderId,
            warehouse_id: dto.warehouseId,
            status: 'pending',
            created_by: actorId,
            updated_by: actorId,
            items: {
              create: items.map((i) => ({
                order_item_id: i.id,
                quantity: i.quantity,
                created_by: actorId,
                updated_by: actorId,
              })),
            },
            pick_lists: {
              create: {
                pick_number: `PICK-${Date.now().toString(36).toUpperCase()}`,
                status: 'open',
                created_by: actorId,
                updated_by: actorId,
              },
            },
            packing_lists: {
              create: {
                pack_number: `PACK-${Date.now().toString(36).toUpperCase()}`,
                status: 'open',
                created_by: actorId,
                updated_by: actorId,
              },
            },
          },
          include: { items: true, pick_lists: true, packing_lists: true },
        });

        if (order.status === 'confirmed') {
          await this.orders.transitionStatus(
            orderId,
            'confirmed',
            'processing',
            'Fulfillment created',
            actorId,
          );
        }

        this.events.fulfillmentCreated(
          new OrderFulfillmentCreatedEvent({
            fulfillmentId: fo.id,
            orderId,
            fulfillmentNumber: fo.fulfillment_number,
          }),
        );

        await this.cache.invalidateOrder(orderId, order.customer_id ?? undefined);
        return fo;
      },
      { ttlMs: 20_000, waitMs: 5_000 },
    );
  }

  async adminList(page = 1, limit = 20, status?: OrderStatus) {
    const take = Math.min(limit, 100);
    const [total, rows] = await this.orders.listAdmin({
      status,
      skip: (page - 1) * take,
      take,
    });
    return paginatedResult(rows.map(mapOrderSummary), page, take, total);
  }

  async updateFulfillmentStatus(
    fulfillmentId: string,
    status: 'picking' | 'packed' | 'shipped' | 'delivered' | 'cancelled',
  ) {
    const fo = await this.fulfillment.findById(fulfillmentId);
    if (!fo) throw new AppException(ErrorCodes.NOT_FOUND, 'Fulfillment not found', 404);
    return this.orders.client.fulfillmentOrder.update({
      where: { id: fulfillmentId },
      data: {
        status,
        ...(status === 'shipped' ? { shipped_at: new Date() } : {}),
        ...(status === 'delivered' ? { delivered_at: new Date() } : {}),
      },
    });
  }

  async createInvoice(orderId: string, actorId?: string) {
    const order = await this.orders.findById(orderId);
    if (!order) throw new AppException(ErrorCodes.NOT_FOUND, 'Order not found', 404);
    return this.orders.client.invoice.create({
      data: {
        invoice_number: `INV-${Date.now().toString(36).toUpperCase()}`,
        order_id: orderId,
        invoice_date: new Date(),
        currency: order.currency,
        subtotal: order.subtotal,
        discount_total: order.discount_total,
        shipping_charge: order.shipping_charge,
        grand_total: order.grand_total,
        status: 'issued',
        created_by: actorId,
        updated_by: actorId,
        items: {
          create: order.items.map((i) => ({
            order_item_id: i.id,
            variant_id: i.variant_id,
            description: i.product_name_snapshot,
            quantity: i.quantity,
            unit_price: i.unit_price,
            line_total: i.line_total,
            created_by: actorId,
            updated_by: actorId,
          })),
        },
      },
      include: { items: true },
    });
  }

  // Wishlist
  async getWishlist(userId: string) {
    const wl = await this.wishlists.getOrCreate(userId);
    return {
      id: wl.id,
      name: wl.name,
      items: wl.items
        .filter((i) => !i.deleted_at)
        .map((i) => ({
          id: i.id,
          variantId: i.variant_id,
          sku: i.variant.sku,
        })),
    };
  }

  async addWishlistItem(userId: string, variantId: string) {
    const wl = await this.wishlists.getOrCreate(userId);
    await this.wishlists.addItem(wl.id, variantId);
    return this.getWishlist(userId);
  }

  async removeWishlistItem(userId: string, itemId: string) {
    await this.wishlists.removeItem(itemId);
    return this.getWishlist(userId);
  }

  listCancellationReasons() {
    return this.fulfillment.listCancellationReasons();
  }

  risk(orderId: string) {
    return this.fulfillment.listRiskEvents(orderId);
  }

  private async requireOwnedOrder(orderId: string, userId: string) {
    const order = await this.orders.findById(orderId);
    if (!order) throw new AppException(ErrorCodes.NOT_FOUND, 'Order not found', 404);
    if (order.customer_id !== userId) {
      throw new AppException(ErrorCodes.FORBIDDEN, 'Order access denied', 403);
    }
    return order;
  }
}
