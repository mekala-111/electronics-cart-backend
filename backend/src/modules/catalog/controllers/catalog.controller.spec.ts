import { CatalogController } from './catalog.controller';

describe('CatalogController', () => {
  const catalog = {
    listBrands: jest.fn(async () => [{ slug: 'apple' }]),
    listCategories: jest.fn(async () => []),
    categoryTree: jest.fn(async () => []),
    listCollections: jest.fn(async () => []),
    listAttributes: jest.fn(async () => []),
    searchProducts: jest.fn(async () => ({ data: [], meta: {} })),
    featuredProducts: jest.fn(async () => ({ data: [], meta: {} })),
    newProducts: jest.fn(async () => ({ data: [], meta: {} })),
    refurbishedProducts: jest.fn(async () => ({ data: [], meta: {} })),
    getProduct: jest.fn(async () => ({ slug: 'mac' })),
    productSpecifications: jest.fn(async () => []),
    productMedia: jest.fn(async () => []),
    productVideos: jest.fn(async () => []),
    productQuestions: jest.fn(async () => []),
  };

  const controller = new CatalogController(catalog as never);

  it('delegates brand listing', async () => {
    await expect(controller.listBrands()).resolves.toEqual([{ slug: 'apple' }]);
  });

  it('delegates search', async () => {
    await controller.search({ q: 'mac' });
    expect(catalog.searchProducts).toHaveBeenCalledWith({ q: 'mac' });
  });

  it('delegates product detail', async () => {
    await controller.getOne('macbook-air-m2-13');
    expect(catalog.getProduct).toHaveBeenCalledWith('macbook-air-m2-13');
  });
});
