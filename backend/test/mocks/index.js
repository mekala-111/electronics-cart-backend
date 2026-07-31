"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockPrisma = createMockPrisma;
exports.createMockRedisCache = createMockRedisCache;
exports.createMockQueue = createMockQueue;
function createMockPrisma() {
    return {
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $queryRaw: jest.fn().mockResolvedValue([{ ok: 1 }]),
        $transaction: jest.fn((fn) => fn({})),
    };
}
function createMockRedisCache() {
    const store = new Map();
    return {
        get: jest.fn(async (key) => {
            const raw = store.get(key);
            return raw ? JSON.parse(raw) : null;
        }),
        set: jest.fn(async (key, value) => {
            store.set(key, JSON.stringify(value));
        }),
        del: jest.fn(async (key) => {
            store.delete(key);
        }),
        delByPrefix: jest.fn(async () => undefined),
        getOrSet: jest.fn(async (key, factory) => {
            if (store.has(key))
                return JSON.parse(store.get(key));
            const value = await factory();
            store.set(key, JSON.stringify(value));
            return value;
        }),
        ping: jest.fn(async () => 'PONG'),
    };
}
function createMockQueue() {
    return {
        enqueue: jest.fn(async () => ({ id: 'job-1' })),
        close: jest.fn(),
    };
}
//# sourceMappingURL=index.js.map