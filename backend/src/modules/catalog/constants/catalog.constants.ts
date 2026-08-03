export const CATALOG_PERMISSIONS = {
  READ: 'catalog.read',
  WRITE: 'catalog.write',
} as const;

export const CATALOG_CACHE = {
  TTL: 300,
  PREFIX: 'catalog',
  brands: () => 'catalog:brands:list',
  productTypes: () => 'catalog:product-types:list',
  categories: () => 'catalog:categories:list',
  categoryTree: () => 'catalog:categories:tree',
  collections: () => 'catalog:collections:list',
  product: (idOrSlug: string) => `catalog:product:${idOrSlug}`,
  productList: (hash: string) => `catalog:products:list:${hash}`,
  featured: () => 'catalog:products:featured',
  newest: () => 'catalog:products:new',
  refurbished: () => 'catalog:products:refurbished',
} as const;

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
