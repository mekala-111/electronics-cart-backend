import { CacheService } from './cache.service';

describe('CacheService fail-open', () => {
  function build(client: Record<string, jest.Mock>) {
    const svc = Object.create(CacheService.prototype) as CacheService;
    Object.assign(svc, {
      logger: { warn: jest.fn() },
      client,
    });
    return svc;
  }

  it('get returns null when Redis throws', async () => {
    const svc = build({
      get: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    });
    await expect(svc.get('k')).resolves.toBeNull();
  });

  it('set swallows Redis errors', async () => {
    const svc = build({
      set: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    });
    await expect(svc.set('k', { a: 1 }, 60)).resolves.toBeUndefined();
  });

  it('getOrSet still runs factory when Redis is down', async () => {
    const svc = build({
      get: jest.fn().mockRejectedValue(new Error('down')),
      set: jest.fn().mockRejectedValue(new Error('down')),
    });
    const factory = jest.fn(async () => ({ ok: true }));
    await expect(svc.getOrSet('k', factory, 60)).resolves.toEqual({ ok: true });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('delByPrefix returns 0 when Redis throws', async () => {
    const svc = build({
      scan: jest.fn().mockRejectedValue(new Error('down')),
    });
    await expect(svc.delByPrefix('catalog:')).resolves.toBe(0);
  });
});
