export function createMockPrisma() {
  return {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ ok: 1 }]),
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn({})),
  };
}

export function createMockRedisCache() {
  const store = new Map<string, string>();
  return {
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
    delByPrefix: jest.fn(async () => undefined),
    getOrSet: jest.fn(async (key: string, factory: () => Promise<unknown>) => {
      if (store.has(key)) return JSON.parse(store.get(key)!);
      const value = await factory();
      store.set(key, JSON.stringify(value));
      return value;
    }),
    ping: jest.fn(async () => 'PONG'),
  };
}

export function createMockQueue() {
  return {
    enqueue: jest.fn(async () => ({ id: 'job-1' })),
    close: jest.fn(),
  };
}
