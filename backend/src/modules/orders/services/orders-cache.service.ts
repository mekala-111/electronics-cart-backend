import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../shared/cache/cache.service';
import { ORDERS_CACHE } from '../constants/orders.constants';

@Injectable()
export class OrdersCacheService {
  constructor(private readonly cache: CacheService) {}

  getOrSet<T>(key: string, factory: () => Promise<T>, ttl = ORDERS_CACHE.TTL) {
    return this.cache.get<T>(key).then(async (hit) => {
      if (hit !== null) return hit;
      const value = await factory();
      await this.cache.set(key, value, ttl);
      return value;
    });
  }

  async invalidateCart(key: string) {
    await this.cache.del(ORDERS_CACHE.cart(key));
  }

  async invalidateOrder(orderId: string, userId?: string) {
    await this.cache.del(ORDERS_CACHE.order(orderId));
    if (userId) await this.cache.del(ORDERS_CACHE.recent(userId));
  }
}
