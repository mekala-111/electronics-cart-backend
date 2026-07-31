import { createHash } from 'node:crypto';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService', () => {
  const store = new Map<string, string>();
  const mockRedis = {
    set: jest.fn(async (key: string, value: string, _ex: string, _ttl: number, nx?: string) => {
      if (nx === 'NX' && store.has(key)) return null;
      store.set(key, value);
      return 'OK';
    }),
  };
  const cache = {
    get: jest.fn(async (key: string) => {
      const raw = store.get(key);
      return raw ? JSON.parse(raw) : null;
    }),
    set: jest.fn(async (key: string, value: unknown) => {
      store.set(key, JSON.stringify(value));
    }),
    del: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    getClient: () => mockRedis,
  };

  const service = new IdempotencyService(cache as never);

  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
  });

  it('builds stable fingerprints', () => {
    const a = service.fingerprint('POST', '/api/orders', { a: 1 });
    const b = service.fingerprint('POST', '/api/orders', { a: 1 });
    const c = service.fingerprint('POST', '/api/orders', { a: 2 });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toHaveLength(64);
    expect(createHash('sha256').update('x').digest('hex')).toHaveLength(64);
  });

  it('begin is exclusive', async () => {
    const first = await service.begin('user:POST:/x', 'key-1', 'fp');
    const second = await service.begin('user:POST:/x', 'key-1', 'fp');
    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('stores completed responses', async () => {
    await service.begin('scope', 'k', 'fp');
    await service.complete('scope', 'k', 'fp', 201, { ok: true });
    const record = await service.get('scope', 'k');
    expect(record?.status).toBe('completed');
    expect(record?.body).toEqual({ ok: true });
  });
});
