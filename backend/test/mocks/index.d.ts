export declare function createMockPrisma(): {
    $connect: jest.Mock<any, any, any>;
    $disconnect: jest.Mock<any, any, any>;
    $queryRaw: jest.Mock<any, any, any>;
    $transaction: jest.Mock<unknown, [fn: (tx: unknown) => unknown], any>;
};
export declare function createMockRedisCache(): {
    get: jest.Mock<Promise<any>, [key: string], any>;
    set: jest.Mock<Promise<void>, [key: string, value: unknown], any>;
    del: jest.Mock<Promise<void>, [key: string], any>;
    delByPrefix: jest.Mock<Promise<undefined>, [], any>;
    getOrSet: jest.Mock<Promise<any>, [key: string, factory: () => Promise<unknown>], any>;
    ping: jest.Mock<Promise<string>, [], any>;
};
export declare function createMockQueue(): {
    enqueue: jest.Mock<Promise<{
        id: string;
    }>, [], any>;
    close: jest.Mock<any, any, any>;
};
