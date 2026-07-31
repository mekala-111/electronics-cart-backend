import { ProductRepository } from './product.repository';

describe('ProductRepository.search', () => {
  const prisma = {
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    product: {
      count: jest.fn(async () => 1),
      findMany: jest.fn(async () => []),
    },
  };

  const repo = new ProductRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies keyword and brand filters', async () => {
    await repo.search({ q: 'mac', brandSlug: 'apple', page: 1, limit: 10 });
    expect(prisma.product.count).toHaveBeenCalled();
    const where = prisma.product.findMany.mock.calls[0][0].where;
    expect(where.OR).toBeDefined();
    expect(where.brand).toEqual({ slug: 'apple', deleted_at: null });
  });

  it('filters by price via variant relation', async () => {
    await repo.search({ minPrice: 1000, maxPrice: 50000 });
    const where = prisma.product.findMany.mock.calls[0][0].where;
    expect(where.variants.some.sale_price).toEqual({ gte: 1000, lte: 50000 });
  });
});
