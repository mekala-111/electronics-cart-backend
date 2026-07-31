import { Injectable } from '@nestjs/common';
import { Prisma, ProductCondition, StockStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { ProductSearchFilters } from '../interfaces';

const productInclude = {
  brand: true,
  category: true,
  variants: { where: { deleted_at: null }, orderBy: { sale_price: 'asc' as const } },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.product.findFirst({
      where: { id, deleted_at: null },
      include: productInclude,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.product.findFirst({
      where: { slug, deleted_at: null },
      include: productInclude,
    });
  }

  async search(filters: ProductSearchFilters) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      deleted_at: null,
      status: 'active',
    };

    if (filters.brandId) where.brand_id = filters.brandId;
    if (filters.brandSlug) where.brand = { slug: filters.brandSlug, deleted_at: null };
    if (filters.categoryId) where.category_id = filters.categoryId;
    if (filters.categorySlug) where.category = { slug: filters.categorySlug, deleted_at: null };
    if (filters.featured) where.is_featured = true;
    if (filters.refurbished) where.is_refurbished = true;
    if (filters.newArrival) where.is_new_arrival = true;
    if (filters.minRating != null) where.rating_avg = { gte: filters.minRating };

    if (filters.collectionId || filters.collectionSlug) {
      where.collection_products = {
        some: {
          deleted_at: null,
          status: 'active',
          collection: {
            deleted_at: null,
            status: 'active',
            ...(filters.collectionId ? { id: filters.collectionId } : {}),
            ...(filters.collectionSlug ? { slug: filters.collectionSlug } : {}),
          },
        },
      };
    }

    const variantWhere: Prisma.ProductVariantWhereInput = { deleted_at: null, status: 'active' };
    if (filters.minPrice != null || filters.maxPrice != null) {
      variantWhere.sale_price = {
        ...(filters.minPrice != null ? { gte: filters.minPrice } : {}),
        ...(filters.maxPrice != null ? { lte: filters.maxPrice } : {}),
      };
    }
    if (filters.condition) {
      variantWhere.condition = filters.condition as ProductCondition;
    }
    if (filters.availability) {
      variantWhere.stock_status = filters.availability as StockStatus;
    }
    if (filters.attributes?.length) {
      variantWhere.variant_attribute_values = {
        some: {
          deleted_at: null,
          attribute_value_id: { in: filters.attributes },
        },
      };
    }

    const needsVariantFilter =
      filters.minPrice != null ||
      filters.maxPrice != null ||
      !!filters.condition ||
      !!filters.availability ||
      !!filters.attributes?.length;

    if (needsVariantFilter) {
      where.variants = { some: variantWhere };
    }

    if (filters.q?.trim()) {
      const q = filters.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { short_description: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { brand: { name: { contains: q, mode: 'insensitive' } } },
        { variants: { some: { sku: { contains: q, mode: 'insensitive' }, deleted_at: null } } },
      ];
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ created_at: 'desc' }];
    switch (filters.sort) {
      case 'name':
        orderBy = [{ name: 'asc' }];
        break;
      case 'rating':
        orderBy = [{ rating_avg: 'desc' }];
        break;
      case 'newest':
        orderBy = [{ created_at: 'desc' }];
        break;
      case 'price_asc':
      case 'price_desc':
        // ponytail: sort by created_at then client can refine; true price sort needs raw SQL
        orderBy = [{ created_at: 'desc' }];
        break;
      default:
        break;
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    let data = rows;
    if (filters.sort === 'price_asc' || filters.sort === 'price_desc') {
      const dir = filters.sort === 'price_asc' ? 1 : -1;
      data = [...rows].sort((a, b) => {
        const pa = Number(a.variants[0]?.sale_price ?? Number.POSITIVE_INFINITY);
        const pb = Number(b.variants[0]?.sale_price ?? Number.POSITIVE_INFINITY);
        return (pa - pb) * dir;
      });
    }

    return { data, total, page, limit };
  }

  create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data, include: productInclude });
  }

  update(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({ where: { id }, data, include: productInclude });
  }

  softDelete(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { deleted_at: new Date(), status: 'archived' },
    });
  }

  specifications(productId: string) {
    return this.prisma.productSpecification.findMany({
      where: { product_id: productId, deleted_at: null, status: 'active' },
      include: { group: true },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  }

  media(productId: string) {
    return this.prisma.productMedia.findMany({
      where: { product_id: productId, deleted_at: null, status: 'active' },
      include: { media_file: true },
      orderBy: { sort_order: 'asc' },
    });
  }

  videos(productId: string) {
    return this.prisma.productMedia.findMany({
      where: {
        product_id: productId,
        deleted_at: null,
        status: 'active',
        media_file: { kind: 'video', deleted_at: null },
      },
      include: { media_file: true },
      orderBy: { sort_order: 'asc' },
    });
  }
}
