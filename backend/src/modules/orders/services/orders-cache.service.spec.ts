import { OrdersCacheService } from './orders-cache.service';

describe('OrdersCacheService', () => {
  const store = new Map<string, unknown>();
  const cache = {
    get: jest.fn(async (k: string) => (store.has(k) ? store.get(k) : null)),
    set: jest.fn(async (k: string, v: unknown) => {
      store.set(k, v);
    }),
    del: jest.fn(async (k: string) => {
      store.delete(k);
    }),
  };
  const svc = new OrdersCacheService(cache as never);

  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
  });

  it('caches then invalidates cart', async () => {
    const factory = jest.fn(async () => ({ id: 'c1' }));
    await svc.getOrSet('orders:cart:user:u1', factory);
    await svc.getOrSet('orders:cart:user:u1', factory);
    expect(factory).toHaveBeenCalledTimes(1);
    await svc.invalidateCart('user:u1');
    expect(cache.del).toHaveBeenCalledWith('orders:cart:user:u1');
  });
});
