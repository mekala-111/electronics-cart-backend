import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../shared/cache/cache.service';
import { ANALYTICS_CACHE } from '../constants/analytics.constants';

@Injectable()
export class AnalyticsCacheService {
  constructor(private readonly cache: CacheService) {}

  getOrSet<T>(key: string, factory: () => Promise<T>, ttl = ANALYTICS_CACHE.TTL) {
    return this.cache.get<T>(key).then(async (hit) => {
      if (hit !== null) return hit;
      const value = await factory();
      await this.cache.set(key, value, ttl);
      return value;
    });
  }

  async invalidateDashboards(code?: string) {
    if (code) {
      await this.cache.del(ANALYTICS_CACHE.dashboard(code));
      return;
    }
    for (const c of [
      'executive',
      'sales',
      'revenue',
      'orders',
      'payments',
      'inventory',
      'shipping',
      'warranty',
      'service',
      'marketing',
      'search',
      'recommendation',
      'system',
    ]) {
      await this.cache.del(ANALYTICS_CACHE.dashboard(c));
    }
  }

  async invalidateKpis(period = 'daily') {
    await this.cache.del(ANALYTICS_CACHE.kpis(period));
  }

  async invalidateFunnels() {
    await this.cache.del(ANALYTICS_CACHE.funnels());
  }

  async invalidateTrends(domain: string) {
    await this.cache.del(ANALYTICS_CACHE.trends(domain));
  }

  async invalidateReports() {
    await this.cache.del(ANALYTICS_CACHE.reports());
  }
}
