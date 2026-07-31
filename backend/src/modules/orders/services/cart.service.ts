import { Injectable } from '@nestjs/common';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { PrismaService } from '../../../database/prisma.service';
import { ORDERS_CACHE } from '../constants/orders.constants';
import { mapCart } from '../mappers/orders.mapper';
import { CartRepository } from '../repositories/cart.repository';
import { OrdersCacheService } from './orders-cache.service';

@Injectable()
export class CartService {
  constructor(
    private readonly carts: CartRepository,
    private readonly prisma: PrismaService,
    private readonly cache: OrdersCacheService,
  ) {}

  private cacheKey(userId?: string, sessionKey?: string) {
    return userId ? `user:${userId}` : `session:${sessionKey ?? 'anon'}`;
  }

  async getOrCreate(userId?: string, sessionKey?: string) {
    if (!userId && !sessionKey) {
      throw new AppException(
        ErrorCodes.BAD_REQUEST,
        'user or sessionKey required for cart',
        400,
      );
    }
    const key = this.cacheKey(userId, sessionKey);
    return this.cache.getOrSet(ORDERS_CACHE.cart(key), async () => {
      let cart = userId
        ? await this.carts.findActiveByUser(userId)
        : await this.carts.findActiveBySession(sessionKey!);
      if (!cart) {
        cart = await this.carts.create({ userId, sessionKey, actorId: userId });
      }
      return mapCart(cart);
    });
  }

  async addItem(
    variantId: string,
    quantity: number,
    userId?: string,
    sessionKey?: string,
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, deleted_at: null, status: 'active' },
    });
    if (!variant) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Variant not found', 404);
    }
    const mapped = await this.getOrCreate(userId, sessionKey);
    await this.carts.upsertItem(
      mapped.id,
      variantId,
      quantity,
      Number(variant.sale_price),
      userId,
    );
    await this.cache.invalidateCart(this.cacheKey(userId, sessionKey));
    return this.getOrCreate(userId, sessionKey);
  }

  async updateItem(
    itemId: string,
    quantity: number,
    userId?: string,
    sessionKey?: string,
  ) {
    const cart = await this.getOrCreate(userId, sessionKey);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new AppException(ErrorCodes.NOT_FOUND, 'Cart item not found', 404);
    await this.carts.updateItemQty(itemId, quantity);
    await this.cache.invalidateCart(this.cacheKey(userId, sessionKey));
    return this.getOrCreate(userId, sessionKey);
  }

  async removeItem(itemId: string, userId?: string, sessionKey?: string) {
    const cart = await this.getOrCreate(userId, sessionKey);
    if (!cart.items.some((i) => i.id === itemId)) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Cart item not found', 404);
    }
    await this.carts.softDeleteItem(itemId);
    await this.cache.invalidateCart(this.cacheKey(userId, sessionKey));
    return this.getOrCreate(userId, sessionKey);
  }

  async requireCart(cartId: string, userId?: string) {
    const cart = await this.carts.findById(cartId);
    if (!cart || cart.status !== 'active') {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Cart not found', 404);
    }
    if (userId && cart.user_id && cart.user_id !== userId) {
      throw new AppException(ErrorCodes.FORBIDDEN, 'Cart does not belong to user', 403);
    }
    return cart;
  }
}
