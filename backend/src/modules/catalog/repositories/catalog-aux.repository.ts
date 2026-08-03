import { Injectable } from '@nestjs/common';
import { CmsPageStatus, Prisma, SeoEntityType } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class CatalogAuxRepository {
  constructor(private readonly prisma: PrismaService) {}

  get client() {
    return this.prisma;
  }

  createSpecification(data: Prisma.ProductSpecificationCreateInput) {
    return this.prisma.productSpecification.create({ data });
  }

  softDeleteSpecification(id: string) {
    return this.prisma.productSpecification.update({
      where: { id },
      data: { deleted_at: new Date(), status: 'archived' },
    });
  }

  attachMedia(data: Prisma.ProductMediaCreateInput) {
    return this.prisma.productMedia.create({ data, include: { media_file: true } });
  }

  softDeleteMedia(id: string) {
    return this.prisma.productMedia.update({
      where: { id },
      data: { deleted_at: new Date(), status: 'archived' },
    });
  }

  listBadges() {
    return this.prisma.productBadge.findMany({
      where: { deleted_at: null, status: 'active' },
      orderBy: { label: 'asc' },
    });
  }

  createBadge(data: Prisma.ProductBadgeCreateInput) {
    return this.prisma.productBadge.create({ data });
  }

  assignBadge(badgeId: string, productId: string) {
    return this.prisma.productBadgeAssignment.create({
      data: {
        badge: { connect: { id: badgeId } },
        product: { connect: { id: productId } },
      },
    });
  }

  findSeo(entityType: SeoEntityType, entityId?: string, slug?: string) {
    return this.prisma.seoMetadata.findFirst({
      where: {
        deleted_at: null,
        status: 'active',
        entity_type: entityType,
        ...(entityId ? { entity_id: entityId } : {}),
        ...(slug ? { slug } : {}),
      },
      include: { og_image: true },
    });
  }

  upsertSeo(data: {
    entityType: SeoEntityType;
    entityId?: string;
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImageFileId?: string;
    structuredData?: Prisma.InputJsonValue;
  }) {
    return this.prisma.seoMetadata.create({
      data: {
        entity_type: data.entityType,
        entity_id: data.entityId,
        slug: data.slug,
        meta_title: data.metaTitle,
        meta_description: data.metaDescription,
        canonical_url: data.canonicalUrl,
        og_title: data.ogTitle,
        og_description: data.ogDescription,
        og_image_file_id: data.ogImageFileId,
        structured_data: data.structuredData,
      },
    });
  }

  listBuyingGuides() {
    return this.prisma.buyingGuide.findMany({
      where: { deleted_at: null, status: 'published' },
      orderBy: { published_at: 'desc' },
    });
  }

  createBuyingGuide(data: Prisma.BuyingGuideCreateInput) {
    return this.prisma.buyingGuide.create({ data });
  }

  updateBuyingGuide(id: string, data: Prisma.BuyingGuideUpdateInput) {
    return this.prisma.buyingGuide.update({ where: { id }, data });
  }

  softDeleteBuyingGuide(id: string) {
    return this.prisma.buyingGuide.update({
      where: { id },
      data: { deleted_at: new Date(), status: 'archived' as CmsPageStatus },
    });
  }

  expandSynonyms(term: string) {
    return this.prisma.searchSynonym.findMany({
      where: {
        deleted_at: null,
        status: 'active',
        OR: [
          { synonym: { equals: term, mode: 'insensitive' } },
          { keyword: { keyword: { equals: term, mode: 'insensitive' }, deleted_at: null } },
        ],
      },
      include: { keyword: true },
    });
  }

  listAttributes() {
    return this.prisma.attribute.findMany({
      where: { deleted_at: null, status: 'active' },
      include: {
        values: {
          where: { deleted_at: null, status: 'active' },
          orderBy: { sort_order: 'asc' },
        },
      },
      orderBy: { sort_order: 'asc' },
    });
  }

  listApprovedReviews(productId: string) {
    return this.prisma.productReview.findMany({
      where: {
        product_id: productId,
        deleted_at: null,
        status: 'active',
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
  }
}
