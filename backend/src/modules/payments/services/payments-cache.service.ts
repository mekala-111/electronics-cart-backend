import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../shared/cache/cache.service';
import { PAYMENTS_CACHE } from '../constants/payments.constants';

@Injectable()
export class PaymentsCacheService {
  constructor(private readonly cache: CacheService) {}

  getOrSet<T>(key: string, factory: () => Promise<T>, ttl = PAYMENTS_CACHE.TTL) {
    return this.cache.get<T>(key).then(async (hit) => {
      if (hit !== null) return hit;
      const value = await factory();
      await this.cache.set(key, value, ttl);
      return value;
    });
  }

  async invalidatePayment(id: string, orderId?: string): Promise<void> {
    await this.cache.del(PAYMENTS_CACHE.status(id));
    if (orderId) await this.cache.del(PAYMENTS_CACHE.order(orderId));
  }

  async invalidateMethods(): Promise<void> {
    await this.cache.del(PAYMENTS_CACHE.methods());
  }

  async invalidateSaved(customerId: string): Promise<void> {
    await this.cache.del(PAYMENTS_CACHE.saved(customerId));
  }

  async invalidateGateway(code: string): Promise<void> {
    await this.cache.del(PAYMENTS_CACHE.gateway(code));
  }
}
