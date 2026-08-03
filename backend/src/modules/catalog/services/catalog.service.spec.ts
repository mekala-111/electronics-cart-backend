import { AppException } from '../../../core/errors/app.exception';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  const brands = {
    listActive: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
  const categories = {
    listActive: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
  const collections = {
    listActive: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    replaceProducts: jest.fn(),
  };
  const products = {
    search: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    specifications: jest.fn(),
    media: jest.fn(),
    videos: jest.fn(),
  };
  const variants = {
    findById: jest.fn(),
    findBySku: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    setAttributeValues: jest.fn(),
  };
  const aux = {
    expandSynonyms: jest.fn(async () => []),
    findSeo: jest.fn(async () => null),
    listAttributes: jest.fn(),
    createSpecification: jest.fn(),
    softDeleteSpecification: jest.fn(),
    attachMedia: jest.fn(),
    softDeleteMedia: jest.fn(),
    listBadges: jest.fn(),
    createBadge: jest.fn(),
    assignBadge: jest.fn(),
    upsertSeo: jest.fn(),
    listBuyingGuides: jest.fn(),
    createBuyingGuide: jest.fn(),
    updateBuyingGuide: jest.fn(),
    softDeleteBuyingGuide: jest.fn(),
  };
  const cache = {
    getOrSet: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
    listHash: jest.fn(() => 'hash'),
    invalidateAll: jest.fn(),
    invalidateProduct: jest.fn(),
    invalidateTaxonomy: jest.fn(),
  };
  const locks = {
    withLock: jest.fn((_r: string, fn: () => Promise<unknown>) => fn()),
  };
  Object.assign(locks, { constructor: { resourceKey: (...p: string[]) => p.join(':') } });
  // LockService.resourceKey is static — patch via CatalogService dependency usage
  const events = {
    brandCreated: jest.fn(),
    categoryCreated: jest.fn(),
    productCreated: jest.fn(),
    variantCreated: jest.fn(),
    productUpdated: jest.fn(),
    productDeleted: jest.fn(),
  };

  const storage = {
    put: jest.fn(async () => undefined),
  };
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'storage.publicUrl') return 'http://localhost:3051/uploads';
      if (key === 'storage.bucket') return 'electronics-cart';
      return fallback;
    }),
  };

  const service = new CatalogService(
    brands as never,
    categories as never,
    collections as never,
    products as never,
    variants as never,
    aux as never,
    cache as never,
    locks as never,
    events as never,
    storage as never,
    config as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('searchProducts returns paginated mapped items', async () => {
    products.search.mockResolvedValue({
      data: [
        {
          id: 'p1',
          name: 'Mac',
          slug: 'mac',
          short_description: null,
          description: null,
          seo_title: null,
          seo_description: null,
          meta_keywords: null,
          canonical_url: null,
          is_featured: true,
          is_refurbished: false,
          is_open_box: false,
          is_new_arrival: false,
          rating_avg: 4.5,
          review_count: 2,
          brand_id: 'b',
          category_id: 'c',
          product_type_id: 't',
          status: 'active',
          brand: { id: 'b', name: 'Apple', slug: 'apple' },
          category: { id: 'c', name: 'Laptops', slug: 'laptops' },
          variants: [
            {
              id: 'v1',
              product_id: 'p1',
              sku: 'SKU',
              sale_price: 100,
              currency: 'INR',
              stock_status: 'in_stock',
              deleted_at: null,
              status: 'active',
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    const result = await service.searchProducts({ q: 'mac' });
    expect(result.data[0].slug).toBe('mac');
    expect(result.meta.total).toBe(1);
  });

  it('rejects duplicate brand slug', async () => {
    brands.findBySlug.mockResolvedValue({ id: 'x' });
    await expect(
      service.createBrand({ name: 'X', slug: 'apple' }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('returns empty questions list', async () => {
    products.findById.mockResolvedValue({ id: 'p1', slug: 'mac', status: 'active' });
    await expect(service.productQuestions('p1')).resolves.toEqual([]);
  });

  it('createBrand invalidates cache and emits event', async () => {
    brands.findBySlug.mockResolvedValue(null);
    brands.create.mockResolvedValue({
      id: 'b1',
      name: 'Dell',
      slug: 'dell',
      description: null,
      country: null,
      website: null,
      sort_order: 0,
      logo_file_id: null,
      status: 'active',
    });
    await service.createBrand({ name: 'Dell', slug: 'dell' }, 'actor');
    expect(cache.invalidateTaxonomy).toHaveBeenCalled();
    expect(events.brandCreated).toHaveBeenCalled();
  });
});
