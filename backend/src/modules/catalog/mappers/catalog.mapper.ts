import { Decimal } from '@prisma/client/runtime/library';
import { Brand, Category, Product, ProductVariant } from '@prisma/client';
import { CategoryTreeNode } from '../interfaces';

export function dec(value: Decimal | number | null | undefined): number | null {
  if (value == null) return null;
  return typeof value === 'number' ? value : Number(value);
}

export function mapBrand(b: Brand) {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    description: b.description,
    country: b.country,
    website: b.website,
    sortOrder: b.sort_order,
    logoFileId: b.logo_file_id,
    status: b.status,
  };
}

export function mapCategory(c: Category) {
  return {
    id: c.id,
    parentId: c.parent_id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    sortOrder: c.sort_order,
    iconFileId: c.icon_file_id,
    bannerFileId: c.banner_file_id,
    status: c.status,
  };
}

export function buildCategoryTree(rows: Category[]): CategoryTreeNode[] {
  const nodes = new Map<string, CategoryTreeNode>();
  for (const c of rows) {
    nodes.set(c.id, {
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parent_id,
      sortOrder: c.sort_order,
      children: [],
    });
  }
  const roots: CategoryTreeNode[] = [];
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (list: CategoryTreeNode[]) => {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    list.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export function mapVariant(v: ProductVariant) {
  return {
    id: v.id,
    productId: v.product_id,
    sku: v.sku,
    barcode: v.barcode,
    ram: v.ram,
    storage: v.storage,
    processor: v.processor,
    gpu: v.gpu,
    displaySize: v.display_size,
    displayResolution: v.display_resolution,
    refreshRate: v.refresh_rate,
    operatingSystem: v.operating_system,
    keyboardLayout: v.keyboard_layout,
    color: v.color,
    weight: v.weight,
    batteryHealth: v.battery_health,
    condition: v.condition,
    grade: v.grade,
    mrp: dec(v.mrp),
    salePrice: dec(v.sale_price),
    discountPercent: dec(v.discount_percent),
    currency: v.currency,
    stockStatus: v.stock_status,
    status: v.status,
  };
}

type ProductWithRelations = Product & {
  brand: Brand;
  category: Category;
  variants?: ProductVariant[];
};

export function mapProductListItem(p: ProductWithRelations) {
  const active = (p.variants ?? []).filter((v) => !v.deleted_at && v.status === 'active');
  const prices = active.map((v) => Number(v.sale_price));
  const priceFrom = prices.length ? Math.min(...prices) : null;
  const cheapest = active.sort((a, b) => Number(a.sale_price) - Number(b.sale_price))[0];
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.short_description,
    brand: { id: p.brand.id, name: p.brand.name, slug: p.brand.slug },
    category: { id: p.category.id, name: p.category.name, slug: p.category.slug },
    isFeatured: p.is_featured,
    isRefurbished: p.is_refurbished,
    isNewArrival: p.is_new_arrival,
    ratingAvg: Number(p.rating_avg),
    reviewCount: p.review_count,
    priceFrom,
    currency: cheapest?.currency ?? null,
    stockStatus: cheapest?.stock_status ?? null,
  };
}

export function mapProductDetail(p: ProductWithRelations & Record<string, unknown>) {
  return {
    ...mapProductListItem(p),
    description: p.description,
    seoTitle: p.seo_title,
    seoDescription: p.seo_description,
    metaKeywords: p.meta_keywords,
    canonicalUrl: p.canonical_url,
    isOpenBox: p.is_open_box,
    productTypeId: p.product_type_id,
    variants: (p.variants ?? []).filter((v) => !v.deleted_at).map(mapVariant),
  };
}
