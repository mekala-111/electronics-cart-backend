import { InventoryCacheService } from './inventory-cache.service';

describe('InventoryCacheService', () => {
  const store = new Map<string, unknown>();
  const cache = {
    get: jest.fn(async (k: string) => (store.has(k) ? store.get(k) : null)),
    set: jest.fn(async (k: string, v: unknown) => {
      store.set(k, v);
    }),
    del: jest.fn(async (k: string) => {
      store.delete(k);
    }),
    delByPrefix: jest.fn(async () => 0),
  };
  const svc = new InventoryCacheService(cache as never);

  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
  });

  it('caches stock lookups', async () => {
    const factory = jest.fn(async () => ({ available: 5 }));
    const a = await svc.getOrSet('inventory:stock:w:v', factory);
    const b = await svc.getOrSet('inventory:stock:w:v', factory);
    expect(a).toEqual(b);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('invalidates stock keys', async () => {
    store.set('inventory:stock:w1:v1', {});
    await svc.invalidateStock('w1', 'v1');
    expect(cache.del).toHaveBeenCalledWith('inventory:stock:w1:v1');
  });
});
