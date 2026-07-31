import { LockService } from './lock.service';

describe('LockService', () => {
  const store = new Map<string, string>();
  const mockRedis = {
    set: jest.fn(async (key: string, value: string, _px: string, _ttl: number, nx: string) => {
      if (nx === 'NX' && store.has(key)) return null;
      store.set(key, value);
      return 'OK';
    }),
    eval: jest.fn(async (_script: string, _n: number, key: string, token: string) => {
      if (store.get(key) === token) {
        store.delete(key);
        return 1;
      }
      return 0;
    }),
  };

  const cache = {
    getClient: () => mockRedis,
  };

  const locks = new LockService(cache as never);

  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
  });

  it('acquires and releases a lock', async () => {
    const token = await locks.acquire('inventory:sku-1');
    expect(token).toBeTruthy();
    const released = await locks.release('inventory:sku-1', token!);
    expect(released).toBe(true);
  });

  it('withLock runs exclusive work', async () => {
    const value = await locks.withLock('order:create', async () => 42);
    expect(value).toBe(42);
  });

  it('fails when lock is held', async () => {
    await locks.acquire('payment:1');
    await expect(locks.withLock('payment:1', async () => true)).rejects.toMatchObject({
      code: 'LOCK_NOT_ACQUIRED',
    });
  });
});
