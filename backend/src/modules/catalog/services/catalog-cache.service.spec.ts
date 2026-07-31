import { CatalogCacheService } from './catalog-cache.service';

describe('CatalogCacheService', () => {
  const store = new Map<string, unknown>();
  const cache = {
    get: jest.fn(async (k: string) => (store.has(k) ? store.get(k) : null)),
    set: jest.fn(async (k: string, v: unknown) => {
      store.set(k, v);
    }),
    del: jest.fn(async (k: string) => {
      store.delete(k);
    }),
    delByPrefix: jest.fn(async (prefix: string) => {
      for (const k of [...store.keys()]) {
        if (k.startsWith(prefix)) store.delete(k);
      }
      return 1;
    }),
  };

  const svc = new CatalogCacheService(cache as never);

  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
  });

  it('caches factory results', async () => {
    const factory = jest.fn(async () => [{ id: 1 }]);
    const a = await svc.getOrSet('catalog:brands:list', factory);
    const b = await svc.getOrSet('catalog:brands:list', factory);
    expect(a).toEqual(b);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('invalidates taxonomy keys', async () => {
    store.set('catalog:brands:list', []);
    store.set('catalog:categories:tree', []);
    await svc.invalidateTaxonomy();
    expect(cache.del).toHaveBeenCalled();
  });

  it('hashes list filters stably', () => {
    expect(svc.listHash({ q: 'mac' })).toBe(svc.listHash({ q: 'mac' }));
    expect(svc.listHash({ q: 'mac' })).not.toBe(svc.listHash({ q: 'dell' }));
  });
});
