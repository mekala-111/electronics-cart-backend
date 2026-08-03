import { Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { MARKETING_CACHE } from '../constants/marketing.constants';
import {
  CreateBannerDto,
  CreateBlogDto,
  CreateCmsPageDto,
  CreatePopupDto,
  PatchCmsPageDto,
} from '../dto/marketing.dto';
import { MarketingRepository } from '../repositories/marketing.repository';
import { MarketingCacheService } from './marketing-cache.service';

@Injectable()
export class CmsService {
  private readonly logger = new Logger(CmsService.name);

  constructor(
    private readonly repo: MarketingRepository,
    private readonly cache: MarketingCacheService,
  ) {}

  getPageBySlug(slug: string) {
    return this.cache.getOrSet(MARKETING_CACHE.page(slug), async () => {
      const page = await this.repo.client.cmsPage.findFirst({
        where: { slug, deleted_at: null, status: 'published' },
        include: {
          sections: {
            where: { deleted_at: null, status: 'active' },
            orderBy: { sort_order: 'asc' },
          },
        },
      });
      if (!page) {
        throw new AppException(ErrorCodes.NOT_FOUND, 'Page not found', 404);
      }
      return {
        id: page.id,
        slug: page.slug,
        title: page.title,
        pageType: page.page_type,
        publishedAt: page.published_at,
        sections: page.sections.map((s) => ({
          id: s.id,
          key: s.section_key,
          type: s.section_type,
          title: s.title,
          config: s.config_json,
          sortOrder: s.sort_order,
        })),
      };
    });
  }

  async createPage(actorId: string, dto: CreateCmsPageDto) {
    const page = await this.repo.client.cmsPage.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        page_type: dto.pageType ?? 'page',
        status: 'draft',
        created_by: actorId,
        sections: dto.sections?.length
          ? {
              create: dto.sections.map((s, i) => ({
                section_key: s.sectionKey,
                section_type: s.sectionType,
                title: s.title,
                config_json: s.configJson as never,
                sort_order: s.sortOrder ?? i,
                created_by: actorId,
              })),
            }
          : undefined,
      },
    });
    await this.repo.audit({
      entityType: 'cms_page',
      entityId: page.id,
      action: 'create',
      actorId,
    });
    return { id: page.id, slug: page.slug, status: page.status };
  }

  async patchPage(actorId: string, id: string, dto: PatchCmsPageDto) {
    const page = await this.repo.client.cmsPage.findFirst({
      where: { id, deleted_at: null },
    });
    if (!page) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Page not found', 404);
    }
    const updated = await this.repo.client.cmsPage.update({
      where: { id },
      data: {
        title: dto.title,
        status: dto.status,
        published_at:
          dto.status === 'published' ? new Date() : page.published_at,
        updated_by: actorId,
      },
    });
    await this.cache.invalidatePage(page.slug);
    await this.repo.audit({
      entityType: 'cms_page',
      entityId: id,
      action: 'update',
      actorId,
      next: dto,
    });
    return { id: updated.id, status: updated.status };
  }

  /** ponytail: store settings live in a published CMS page section — no new table */
  async getStoreSettings() {
    const page = await this.repo.client.cmsPage.findFirst({
      where: { slug: 'store-settings', deleted_at: null },
      include: {
        sections: {
          where: { deleted_at: null, section_key: 'store' },
          take: 1,
        },
      },
    });
    const cfg = (page?.sections[0]?.config_json ?? {}) as Record<string, unknown>;
    return {
      storeName: String(cfg.storeName ?? 'Electronics Cart'),
      supportPhone: String(cfg.supportPhone ?? ''),
      gstin: String(cfg.gstin ?? ''),
      pageId: page?.id ?? null,
    };
  }

  async upsertStoreSettings(
    actorId: string,
    dto: { storeName?: string; supportPhone?: string; gstin?: string },
  ) {
    const current = await this.getStoreSettings();
    const next = {
      storeName: dto.storeName ?? current.storeName,
      supportPhone: dto.supportPhone ?? current.supportPhone,
      gstin: dto.gstin ?? current.gstin,
    };

    let page = await this.repo.client.cmsPage.findFirst({
      where: { slug: 'store-settings', deleted_at: null },
      include: { sections: { where: { deleted_at: null, section_key: 'store' }, take: 1 } },
    });

    if (!page) {
      page = await this.repo.client.cmsPage.create({
        data: {
          slug: 'store-settings',
          title: 'Store Settings',
          page_type: 'settings',
          status: 'published',
          published_at: new Date(),
          created_by: actorId,
          updated_by: actorId,
          sections: {
            create: {
              section_key: 'store',
              section_type: 'json',
              title: 'Store',
              config_json: next,
              created_by: actorId,
            },
          },
        },
        include: { sections: true },
      });
    } else if (page.sections[0]) {
      await this.repo.client.cmsSection.update({
        where: { id: page.sections[0].id },
        data: { config_json: next, updated_by: actorId },
      });
      await this.repo.client.cmsPage.update({
        where: { id: page.id },
        data: { status: 'published', published_at: new Date(), updated_by: actorId },
      });
    } else {
      await this.repo.client.cmsSection.create({
        data: {
          page_id: page.id,
          section_key: 'store',
          section_type: 'json',
          title: 'Store',
          config_json: next,
          created_by: actorId,
        },
      });
    }

    await this.cache.invalidatePage('store-settings');
    return next;
  }

  listBanners() {
    return this.cache.getOrSet(MARKETING_CACHE.banners(), async () => {
      const now = new Date();
      const rows = await this.repo.client.banner.findMany({
        where: {
          deleted_at: null,
          status: 'active',
          OR: [{ starts_at: null }, { starts_at: { lte: now } }],
          AND: [{ OR: [{ ends_at: null }, { ends_at: { gte: now } }] }],
        },
        include: { group: true },
        orderBy: { sort_order: 'asc' },
      });
      return rows.map((b) => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle,
        linkUrl: b.link_url,
        placement: b.group?.placement ?? 'homepage',
        groupCode: b.group?.code,
        mediaFileId: b.media_file_id,
        sortOrder: b.sort_order,
      }));
    });
  }

  async createBanner(actorId: string, dto: CreateBannerDto) {
    let groupId = dto.groupId;
    if (!groupId && dto.placement) {
      let group = await this.repo.client.bannerGroup.findFirst({
        where: { code: dto.placement, deleted_at: null },
      });
      if (!group) {
        group = await this.repo.client.bannerGroup.create({
          data: {
            code: dto.placement,
            name: dto.placement,
            placement: dto.placement,
            created_by: actorId,
          },
        });
      }
      groupId = group.id;
    }

    const banner = await this.repo.client.banner.create({
      data: {
        group_id: groupId,
        title: dto.title,
        subtitle: dto.subtitle,
        link_url: dto.linkUrl,
        media_file_id: dto.mediaFileId,
        starts_at: dto.startsAt ? new Date(dto.startsAt) : undefined,
        ends_at: dto.endsAt ? new Date(dto.endsAt) : undefined,
        created_by: actorId,
      },
    });
    await this.cache.invalidateBanners();
    await this.repo.audit({
      entityType: 'banner',
      entityId: banner.id,
      action: 'create',
      actorId,
    });
    return { id: banner.id, title: banner.title };
  }

  /** Popups map to banners in a `popup` placement group (no cms_popups table). */
  createPopup(actorId: string, dto: CreatePopupDto) {
    return this.createBanner(actorId, { ...dto, placement: dto.placement ?? 'popup' });
  }

  getNavigation() {
    return this.cache.getOrSet(MARKETING_CACHE.nav(), async () => {
      const layout = await this.repo.client.homepageLayout.findFirst({
        where: { is_default: true, deleted_at: null, status: 'active' },
        include: {
          section_items: {
            where: {
              deleted_at: null,
              status: 'active',
              section_type: { in: ['navigation', 'menu', 'footer'] },
            },
            orderBy: { sort_order: 'asc' },
          },
        },
      });
      const pages = await this.repo.client.cmsPage.findMany({
        where: {
          deleted_at: null,
          status: 'published',
          page_type: { in: ['navigation', 'menu'] },
        },
        take: 50,
      });
      return {
        layoutCode: layout?.code ?? null,
        items:
          layout?.section_items.map((i) => ({
            key: i.section_key,
            type: i.section_type,
            title: i.title,
            config: i.config_json,
          })) ?? [],
        pages: pages.map((p) => ({ slug: p.slug, title: p.title })),
      };
    });
  }

  async listBlogs() {
    const rows = await this.repo.client.blog.findMany({
      where: { deleted_at: null, status: 'published' },
      orderBy: { published_at: 'desc' },
      take: 50,
      include: { category: true, tag_maps: { include: { tag: true } } },
    });
    return rows.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      excerpt: b.excerpt,
      category: b.category?.name,
      tags: b.tag_maps.map((t) => t.tag.name),
      publishedAt: b.published_at,
    }));
  }

  async getBlog(slug: string) {
    const blog = await this.repo.client.blog.findFirst({
      where: { slug, deleted_at: null, status: 'published' },
      include: {
        category: true,
        tag_maps: { include: { tag: true } },
        comments: {
          where: { is_approved: true, deleted_at: null },
          take: 50,
        },
      },
    });
    if (!blog) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Blog not found', 404);
    }
    return {
      id: blog.id,
      slug: blog.slug,
      title: blog.title,
      excerpt: blog.excerpt,
      body: blog.body,
      category: blog.category?.name,
      tags: blog.tag_maps.map((t) => t.tag.name),
      comments: blog.comments.map((c) => ({ id: c.id, body: c.body })),
      publishedAt: blog.published_at,
    };
  }

  async createBlog(actorId: string, dto: CreateBlogDto) {
    const blog = await this.repo.client.blog.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        body: dto.body,
        excerpt: dto.excerpt,
        category_id: dto.categoryId,
        author_id: actorId,
        status: 'draft',
        created_by: actorId,
      },
    });
    await this.repo.audit({
      entityType: 'blog',
      entityId: blog.id,
      action: 'create',
      actorId,
    });
    return { id: blog.id, slug: blog.slug };
  }

  async listGuides() {
    const rows = await this.repo.client.buyingGuide.findMany({
      where: { deleted_at: null, status: 'published' },
      orderBy: { published_at: 'desc' },
      take: 50,
    });
    return rows.map((g) => ({
      id: g.id,
      slug: g.slug,
      title: g.title,
      excerpt: g.excerpt,
      publishedAt: g.published_at,
    }));
  }
}
