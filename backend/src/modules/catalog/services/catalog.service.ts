import { Injectable } from '@nestjs/common';
import { Prisma, ProductCondition, SeoEntityType, StockStatus } from '@prisma/client';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { paginatedResult } from '../../../common/utils/pagination.util';
import { LockService } from '../../../shared/lock/lock.service';
import { CATALOG_CACHE, UUID_RE } from '../constants/catalog.constants';
import { CreateBrandDto, UpdateBrandDto } from '../dto/brand.dto';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import {
  AssignCollectionProductsDto,
  CreateCollectionDto,
  UpdateCollectionDto,
} from '../dto/collection.dto';
import {
  AssignBadgeDto,
  AttachProductMediaDto,
  CreateBadgeDto,
  CreateBuyingGuideDto,
  CreateSpecificationDto,
  UpsertSeoDto,
} from '../dto/media.dto';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';
import { ProductSearchDto } from '../dto/product-search.dto';
import { CreateVariantDto, UpdateVariantDto } from '../dto/variant.dto';
import {
  BrandCreatedEvent,
  CategoryCreatedEvent,
  ProductCreatedEvent,
  ProductDeletedEvent,
  ProductUpdatedEvent,
  VariantCreatedEvent,
} from '../events/catalog.events';
import { CatalogEventPublisher } from '../events/catalog-event.publisher';
import {
  buildCategoryTree,
  mapBrand,
  mapCategory,
  mapProductDetail,
  mapProductListItem,
  mapVariant,
} from '../mappers/catalog.mapper';
import { BrandRepository } from '../repositories/brand.repository';
import { CatalogAuxRepository } from '../repositories/catalog-aux.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CollectionRepository } from '../repositories/collection.repository';
import { ProductRepository } from '../repositories/product.repository';
import { VariantRepository } from '../repositories/variant.repository';
import { CatalogCacheService } from './catalog-cache.service';

@Injectable()
export class CatalogService {
  constructor(
    private readonly brands: BrandRepository,
    private readonly categories: CategoryRepository,
    private readonly collections: CollectionRepository,
    private readonly products: ProductRepository,
    private readonly variants: VariantRepository,
    private readonly aux: CatalogAuxRepository,
    private readonly cache: CatalogCacheService,
    private readonly locks: LockService,
    private readonly events: CatalogEventPublisher,
  ) {}

  // ─── Public reads ─────────────────────────────────────────

  listBrands() {
    return this.cache.getOrSet(CATALOG_CACHE.brands(), async () =>
      (await this.brands.listActive()).map(mapBrand),
    );
  }

  listCategories() {
    return this.cache.getOrSet(CATALOG_CACHE.categories(), async () =>
      (await this.categories.listActive()).map(mapCategory),
    );
  }

  categoryTree() {
    return this.cache.getOrSet(CATALOG_CACHE.categoryTree(), async () =>
      buildCategoryTree(await this.categories.listActive()),
    );
  }

  listCollections() {
    return this.cache.getOrSet(CATALOG_CACHE.collections(), async () => {
      const rows = await this.collections.listActive();
      return rows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        mediaFileId: c.media_file_id,
        isAutomatic: c.is_automatic,
        productCount: c._count.products,
      }));
    });
  }

  async searchProducts(dto: ProductSearchDto) {
    const filters = this.toFilters(dto);
    const hash = this.cache.listHash(filters as Record<string, unknown>);
    return this.cache.getOrSet(CATALOG_CACHE.productList(hash), async () => {
      const q = filters.q?.trim();
      if (q) {
        const syn = await this.aux.expandSynonyms(q);
        if (syn.length) {
          const expanded = syn
            .flatMap((s) => [s.synonym, s.keyword.keyword])
            .filter(Boolean);
          filters.q = [q, ...expanded].join(' ');
        }
      }
      const { data, total, page, limit } = await this.products.search(filters);
      return paginatedResult(data.map(mapProductListItem), page, limit, total);
    });
  }

  featuredProducts() {
    return this.cache.getOrSet(CATALOG_CACHE.featured(), () =>
      this.searchProducts({ featured: 'true', limit: 20, sort: 'newest' }),
    );
  }

  newProducts() {
    return this.cache.getOrSet(CATALOG_CACHE.newest(), () =>
      this.searchProducts({ newArrival: 'true', limit: 20, sort: 'newest' }),
    );
  }

  refurbishedProducts() {
    return this.cache.getOrSet(CATALOG_CACHE.refurbished(), () =>
      this.searchProducts({ refurbished: 'true', limit: 20, sort: 'newest' }),
    );
  }

  async getProduct(idOrSlug: string) {
    return this.cache.getOrSet(CATALOG_CACHE.product(idOrSlug), async () => {
      const row = UUID_RE.test(idOrSlug)
        ? await this.products.findById(idOrSlug)
        : await this.products.findBySlug(idOrSlug);
      if (!row || row.status !== 'active') {
        throw new AppException(ErrorCodes.NOT_FOUND, 'Product not found', 404);
      }
      const [specs, media, videos, seo, reviews, related, breadcrumb] = await Promise.all([
        this.products.specifications(row.id),
        this.products.media(row.id),
        this.products.videos(row.id),
        this.aux.findSeo('product' as SeoEntityType, row.id, row.slug),
        this.aux.listApprovedReviews(row.id),
        this.products.search({
          categoryId: row.category_id,
          limit: 8,
          page: 1,
        }),
        this.categories.breadcrumb(row.category_id),
      ]);
      return {
        ...mapProductDetail(row),
        specifications: specs.map((s) => ({
          id: s.id,
          name: s.name,
          value: s.value,
          group: { id: s.group.id, code: s.group.code, name: s.group.name },
          sortOrder: s.sort_order,
        })),
        media: media.map((m) => ({
          id: m.id,
          altText: m.alt_text,
          isPrimary: m.is_primary,
          sortOrder: m.sort_order,
          file: {
            id: m.media_file.id,
            bucket: m.media_file.bucket,
            objectKey: m.media_file.object_key,
            mimeType: m.media_file.mime_type,
            kind: m.media_file.kind,
          },
        })),
        videos: videos.map((m) => ({
          id: m.id,
          altText: m.alt_text,
          file: {
            id: m.media_file.id,
            bucket: m.media_file.bucket,
            objectKey: m.media_file.object_key,
            mimeType: m.media_file.mime_type,
            durationMs: m.media_file.duration_ms,
          },
        })),
        // ponytail: product_questions table not in DB v1.0 — empty until schema adds it
        questions: [] as unknown[],
        reviews: reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          helpfulCount: r.helpful_count,
          verifiedPurchase: r.is_verified_purchase,
          createdAt: r.created_at,
        })),
        relatedProducts: related.data
          .filter((p) => p.id !== row.id)
          .slice(0, 6)
          .map(mapProductListItem),
        breadcrumbs: breadcrumb.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
        })),
        seo: seo
          ? {
              metaTitle: seo.meta_title ?? row.seo_title,
              metaDescription: seo.meta_description ?? row.seo_description,
              canonicalUrl: seo.canonical_url ?? row.canonical_url,
              ogTitle: seo.og_title,
              ogDescription: seo.og_description,
              ogImageFileId: seo.og_image_file_id,
              structuredData: seo.structured_data,
            }
          : {
              metaTitle: row.seo_title,
              metaDescription: row.seo_description,
              canonicalUrl: row.canonical_url,
              ogTitle: row.seo_title,
              ogDescription: row.seo_description,
              ogImageFileId: null,
              structuredData: null,
            },
      };
    });
  }

  async productSpecifications(id: string) {
    await this.requireProduct(id);
    return this.products.specifications(id);
  }

  async productMedia(id: string) {
    await this.requireProduct(id);
    const rows = await this.products.media(id);
    return rows.map((m) => ({
      id: m.id,
      altText: m.alt_text,
      isPrimary: m.is_primary,
      sortOrder: m.sort_order,
      file: {
        id: m.media_file.id,
        bucket: m.media_file.bucket,
        objectKey: m.media_file.object_key,
        mimeType: m.media_file.mime_type,
        kind: m.media_file.kind,
        // BigInt cannot JSON.stringify — expose as number
        byteSize: Number(m.media_file.byte_size),
      },
    }));
  }

  async productVideos(id: string) {
    await this.requireProduct(id);
    const rows = await this.products.videos(id);
    return rows.map((m) => ({
      id: m.id,
      altText: m.alt_text,
      file: {
        id: m.media_file.id,
        bucket: m.media_file.bucket,
        objectKey: m.media_file.object_key,
        mimeType: m.media_file.mime_type,
        durationMs: m.media_file.duration_ms,
        byteSize: Number(m.media_file.byte_size),
      },
    }));
  }

  async productQuestions(_id: string) {
    await this.requireProduct(_id);
    return [];
  }

  listAttributes() {
    return this.aux.listAttributes();
  }

  // ─── Admin writes ─────────────────────────────────────────

  async createBrand(dto: CreateBrandDto, actorId?: string) {
    await this.assertBrandSlugFree(dto.slug);
    const brand = await this.brands.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      country: dto.country,
      website: dto.website,
      sort_order: dto.sortOrder ?? 0,
      logo: dto.logoFileId ? { connect: { id: dto.logoFileId } } : undefined,
      created_by: actorId,
      updated_by: actorId,
    });
    await this.cache.invalidateTaxonomy();
    this.events.brandCreated(new BrandCreatedEvent(brand.id, brand.slug));
    return mapBrand(brand);
  }

  async updateBrand(id: string, dto: UpdateBrandDto, actorId?: string) {
    const existing = await this.requireBrand(id);
    if (dto.slug && dto.slug !== existing.slug) await this.assertBrandSlugFree(dto.slug);
    const brand = await this.brands.update(id, {
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      country: dto.country,
      website: dto.website,
      sort_order: dto.sortOrder,
      logo: dto.logoFileId === undefined
        ? undefined
        : dto.logoFileId
          ? { connect: { id: dto.logoFileId } }
          : { disconnect: true },
      updated_by: actorId,
    });
    await this.cache.invalidateTaxonomy();
    return mapBrand(brand);
  }

  async deleteBrand(id: string) {
    await this.requireBrand(id);
    await this.brands.softDelete(id);
    await this.cache.invalidateTaxonomy();
    return { id, deleted: true };
  }

  async createCategory(dto: CreateCategoryDto, actorId?: string) {
    await this.assertCategorySlugFree(dto.slug);
    if (dto.parentId) await this.requireCategory(dto.parentId);
    const category = await this.categories.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      sort_order: dto.sortOrder ?? 0,
      parent: dto.parentId ? { connect: { id: dto.parentId } } : undefined,
      icon: dto.iconFileId ? { connect: { id: dto.iconFileId } } : undefined,
      banner: dto.bannerFileId ? { connect: { id: dto.bannerFileId } } : undefined,
      created_by: actorId,
      updated_by: actorId,
    });
    await this.cache.invalidateTaxonomy();
    this.events.categoryCreated(new CategoryCreatedEvent(category.id, category.slug));
    return mapCategory(category);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto, actorId?: string) {
    const existing = await this.requireCategory(id);
    if (dto.slug && dto.slug !== existing.slug) await this.assertCategorySlugFree(dto.slug);
    if (dto.parentId) await this.requireCategory(dto.parentId);
    const category = await this.categories.update(id, {
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      sort_order: dto.sortOrder,
      parent: dto.parentId ? { connect: { id: dto.parentId } } : undefined,
      updated_by: actorId,
    });
    await this.cache.invalidateTaxonomy();
    return mapCategory(category);
  }

  async deleteCategory(id: string) {
    await this.requireCategory(id);
    await this.categories.softDelete(id);
    await this.cache.invalidateTaxonomy();
    return { id, deleted: true };
  }

  async createCollection(dto: CreateCollectionDto, actorId?: string) {
    if (await this.collections.findBySlug(dto.slug)) {
      throw new AppException(ErrorCodes.CONFLICT, 'Collection slug already exists', 409);
    }
    const collection = await this.collections.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      is_automatic: dto.isAutomatic ?? false,
      media_file: dto.mediaFileId ? { connect: { id: dto.mediaFileId } } : undefined,
      created_by: actorId,
      updated_by: actorId,
    });
    if (dto.productIds?.length) {
      await this.collections.replaceProducts(collection.id, dto.productIds);
    }
    await this.cache.invalidateTaxonomy();
    return collection;
  }

  async updateCollection(id: string, dto: UpdateCollectionDto, actorId?: string) {
    const existing = await this.collections.findById(id);
    if (!existing) throw new AppException(ErrorCodes.NOT_FOUND, 'Collection not found', 404);
    if (dto.slug && dto.slug !== existing.slug) {
      if (await this.collections.findBySlug(dto.slug)) {
        throw new AppException(ErrorCodes.CONFLICT, 'Collection slug already exists', 409);
      }
    }
    const collection = await this.collections.update(id, {
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      is_automatic: dto.isAutomatic,
      updated_by: actorId,
    });
    if (dto.productIds) {
      await this.collections.replaceProducts(id, dto.productIds);
    }
    await this.cache.invalidateTaxonomy();
    return collection;
  }

  async deleteCollection(id: string) {
    if (!(await this.collections.findById(id))) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Collection not found', 404);
    }
    await this.collections.softDelete(id);
    await this.cache.invalidateTaxonomy();
    return { id, deleted: true };
  }

  async assignCollectionProducts(id: string, dto: AssignCollectionProductsDto) {
    if (!(await this.collections.findById(id))) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Collection not found', 404);
    }
    await this.collections.replaceProducts(id, dto.productIds);
    await this.cache.invalidateTaxonomy();
    return { id, productIds: dto.productIds };
  }

  async createProduct(dto: CreateProductDto, actorId?: string) {
    return this.locks.withLock(
      LockService.resourceKey('catalog', 'product-slug', dto.slug),
      async () => {
        await this.assertProductSlugFree(dto.slug);
        await this.requireBrand(dto.brandId);
        await this.requireCategory(dto.categoryId);
        const product = await this.products.create({
          name: dto.name,
          slug: dto.slug,
          short_description: dto.shortDescription,
          description: dto.description,
          seo_title: dto.seoTitle,
          seo_description: dto.seoDescription,
          meta_keywords: dto.metaKeywords,
          canonical_url: dto.canonicalUrl,
          is_featured: dto.isFeatured ?? false,
          is_refurbished: dto.isRefurbished ?? false,
          is_open_box: dto.isOpenBox ?? false,
          is_new_arrival: dto.isNewArrival ?? false,
          brand: { connect: { id: dto.brandId } },
          category: { connect: { id: dto.categoryId } },
          product_type: { connect: { id: dto.productTypeId } },
          created_by: actorId,
          updated_by: actorId,
        });
        await this.cache.invalidateProduct(product.id, product.slug);
        await this.cache.invalidateTaxonomy();
        this.events.productCreated(new ProductCreatedEvent(product.id, product.slug));
        return mapProductDetail(product);
      },
      { ttlMs: 10_000, waitMs: 3_000 },
    );
  }

  async updateProduct(id: string, dto: UpdateProductDto, actorId?: string) {
    const existing = await this.requireProduct(id);
    if (dto.slug && dto.slug !== existing.slug) await this.assertProductSlugFree(dto.slug);
    if (dto.brandId) await this.requireBrand(dto.brandId);
    if (dto.categoryId) await this.requireCategory(dto.categoryId);
    const product = await this.products.update(id, {
      name: dto.name,
      slug: dto.slug,
      short_description: dto.shortDescription,
      description: dto.description,
      seo_title: dto.seoTitle,
      seo_description: dto.seoDescription,
      meta_keywords: dto.metaKeywords,
      canonical_url: dto.canonicalUrl,
      is_featured: dto.isFeatured,
      is_refurbished: dto.isRefurbished,
      is_open_box: dto.isOpenBox,
      is_new_arrival: dto.isNewArrival,
      brand: dto.brandId ? { connect: { id: dto.brandId } } : undefined,
      category: dto.categoryId ? { connect: { id: dto.categoryId } } : undefined,
      product_type: dto.productTypeId ? { connect: { id: dto.productTypeId } } : undefined,
      updated_by: actorId,
    });
    await this.cache.invalidateProduct(product.id, product.slug);
    this.events.productUpdated(new ProductUpdatedEvent(product.id, product.slug));
    return mapProductDetail(product);
  }

  async deleteProduct(id: string) {
    const existing = await this.requireProduct(id);
    await this.products.softDelete(id);
    await this.cache.invalidateProduct(id, existing.slug);
    this.events.productDeleted(new ProductDeletedEvent(id, existing.slug));
    return { id, deleted: true };
  }

  async createVariant(dto: CreateVariantDto, actorId?: string) {
    return this.locks.withLock(
      LockService.resourceKey('catalog', 'sku', dto.sku),
      async () => {
        await this.requireProduct(dto.productId);
        if (await this.variants.findBySku(dto.sku)) {
          throw new AppException(ErrorCodes.CONFLICT, 'SKU already exists', 409);
        }
        const variant = await this.variants.create({
          product: { connect: { id: dto.productId } },
          sku: dto.sku,
          barcode: dto.barcode,
          ram: dto.ram,
          storage: dto.storage,
          processor: dto.processor,
          gpu: dto.gpu,
          color: dto.color,
          battery_health: dto.batteryHealth,
          condition: (dto.condition as ProductCondition) ?? 'new_sealed',
          grade: (dto.grade as never) ?? 'ungraded',
          mrp: dto.mrp,
          sale_price: dto.salePrice,
          currency: dto.currency ?? 'INR',
          stock_status: (dto.stockStatus as StockStatus) ?? 'in_stock',
          created_by: actorId,
          updated_by: actorId,
        });
        if (dto.attributeValueIds?.length) {
          try {
            await this.variants.setAttributeValues(variant.id, dto.attributeValueIds);
          } catch {
            throw new AppException(ErrorCodes.BAD_REQUEST, 'Invalid attribute values', 400);
          }
        }
        await this.cache.invalidateProduct(dto.productId);
        this.events.variantCreated(
          new VariantCreatedEvent(variant.id, dto.productId, variant.sku),
        );
        return mapVariant(variant);
      },
      { ttlMs: 10_000, waitMs: 3_000 },
    );
  }

  async updateVariant(id: string, dto: UpdateVariantDto, actorId?: string) {
    const existing = await this.variants.findById(id);
    if (!existing) throw new AppException(ErrorCodes.NOT_FOUND, 'Variant not found', 404);
    if (dto.sku && dto.sku !== existing.sku) {
      if (await this.variants.findBySku(dto.sku)) {
        throw new AppException(ErrorCodes.CONFLICT, 'SKU already exists', 409);
      }
    }
    const variant = await this.variants.update(id, {
      sku: dto.sku,
      barcode: dto.barcode,
      ram: dto.ram,
      storage: dto.storage,
      processor: dto.processor,
      gpu: dto.gpu,
      color: dto.color,
      battery_health: dto.batteryHealth,
      condition: dto.condition as ProductCondition | undefined,
      mrp: dto.mrp,
      sale_price: dto.salePrice,
      currency: dto.currency,
      stock_status: dto.stockStatus as StockStatus | undefined,
      updated_by: actorId,
    });
    if (dto.attributeValueIds) {
      try {
        await this.variants.setAttributeValues(id, dto.attributeValueIds);
      } catch {
        throw new AppException(ErrorCodes.BAD_REQUEST, 'Invalid attribute values', 400);
      }
    }
    await this.cache.invalidateProduct(existing.product_id);
    return mapVariant(variant);
  }

  async deleteVariant(id: string) {
    const existing = await this.variants.findById(id);
    if (!existing) throw new AppException(ErrorCodes.NOT_FOUND, 'Variant not found', 404);
    await this.variants.softDelete(id);
    await this.cache.invalidateProduct(existing.product_id);
    return { id, deleted: true };
  }

  async attachMedia(productId: string, dto: AttachProductMediaDto) {
    await this.requireProduct(productId);
    const row = await this.aux.attachMedia({
      product: { connect: { id: productId } },
      media_file: { connect: { id: dto.mediaFileId } },
      alt_text: dto.altText,
      is_primary: dto.isPrimary ?? false,
      sort_order: dto.sortOrder ?? 0,
    });
    await this.cache.invalidateProduct(productId);
    return row;
  }

  async deleteMedia(productId: string, mediaId: string) {
    await this.requireProduct(productId);
    await this.aux.softDeleteMedia(mediaId);
    await this.cache.invalidateProduct(productId);
    return { id: mediaId, deleted: true };
  }

  async addSpecification(productId: string, dto: CreateSpecificationDto) {
    await this.requireProduct(productId);
    const row = await this.aux.createSpecification({
      product: { connect: { id: productId } },
      group: { connect: { id: dto.groupId } },
      name: dto.name,
      value: dto.value,
      sort_order: dto.sortOrder ?? 0,
    });
    await this.cache.invalidateProduct(productId);
    return row;
  }

  async deleteSpecification(productId: string, specId: string) {
    await this.requireProduct(productId);
    await this.aux.softDeleteSpecification(specId);
    await this.cache.invalidateProduct(productId);
    return { id: specId, deleted: true };
  }

  createBadge(dto: CreateBadgeDto) {
    return this.aux.createBadge({
      code: dto.code,
      label: dto.label,
      color_hex: dto.colorHex,
    });
  }

  listBadges() {
    return this.aux.listBadges();
  }

  async assignBadge(dto: AssignBadgeDto) {
    await this.requireProduct(dto.productId);
    const row = await this.aux.assignBadge(dto.badgeId, dto.productId);
    await this.cache.invalidateProduct(dto.productId);
    return row;
  }

  upsertSeo(dto: UpsertSeoDto) {
    return this.aux.upsertSeo({
      entityType: dto.entityType as SeoEntityType,
      entityId: dto.entityId,
      slug: dto.slug,
      metaTitle: dto.metaTitle,
      metaDescription: dto.metaDescription,
      canonicalUrl: dto.canonicalUrl,
      ogTitle: dto.ogTitle,
      ogDescription: dto.ogDescription,
      ogImageFileId: dto.ogImageFileId,
      structuredData: dto.structuredData as Prisma.InputJsonValue | undefined,
    });
  }

  createBuyingGuide(dto: CreateBuyingGuideDto, actorId?: string) {
    return this.aux.createBuyingGuide({
      slug: dto.slug,
      title: dto.title,
      body: dto.body,
      excerpt: dto.excerpt,
      status: (dto.status as never) ?? 'draft',
      cover_file: dto.coverFileId ? { connect: { id: dto.coverFileId } } : undefined,
      created_by: actorId,
      updated_by: actorId,
    });
  }

  listBuyingGuides() {
    return this.aux.listBuyingGuides();
  }

  async deleteBuyingGuide(id: string) {
    await this.aux.softDeleteBuyingGuide(id);
    return { id, deleted: true };
  }

  // ─── helpers ──────────────────────────────────────────────

  private toFilters(dto: ProductSearchDto) {
    return {
      q: dto.q,
      brandId: dto.brandId,
      brandSlug: dto.brandSlug,
      categoryId: dto.categoryId,
      categorySlug: dto.categorySlug,
      collectionId: dto.collectionId,
      collectionSlug: dto.collectionSlug,
      minPrice: dto.minPrice,
      maxPrice: dto.maxPrice,
      condition: dto.condition,
      availability: dto.availability,
      attributes: dto.attributes
        ? dto.attributes.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
      minRating: dto.minRating,
      featured: dto.featured === 'true',
      refurbished: dto.refurbished === 'true',
      newArrival: dto.newArrival === 'true',
      sort: dto.sort,
      page: dto.page,
      limit: dto.limit,
    };
  }

  private async requireBrand(id: string) {
    const row = await this.brands.findById(id);
    if (!row) throw new AppException(ErrorCodes.NOT_FOUND, 'Brand not found', 404);
    return row;
  }

  private async requireCategory(id: string) {
    const row = await this.categories.findById(id);
    if (!row) throw new AppException(ErrorCodes.NOT_FOUND, 'Category not found', 404);
    return row;
  }

  private async requireProduct(id: string) {
    const row = await this.products.findById(id);
    if (!row) throw new AppException(ErrorCodes.NOT_FOUND, 'Product not found', 404);
    return row;
  }

  private async assertBrandSlugFree(slug: string) {
    if (await this.brands.findBySlug(slug)) {
      throw new AppException(ErrorCodes.CONFLICT, 'Brand slug already exists', 409);
    }
  }

  private async assertCategorySlugFree(slug: string) {
    if (await this.categories.findBySlug(slug)) {
      throw new AppException(ErrorCodes.CONFLICT, 'Category slug already exists', 409);
    }
  }

  private async assertProductSlugFree(slug: string) {
    if (await this.products.findBySlug(slug)) {
      throw new AppException(ErrorCodes.CONFLICT, 'Product slug already exists', 409);
    }
  }
}
