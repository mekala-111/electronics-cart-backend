import { Injectable } from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  listActive(): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { deleted_at: null, status: 'active' },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  }

  findById(id: string) {
    return this.prisma.category.findFirst({ where: { id, deleted_at: null } });
  }

  findBySlug(slug: string) {
    return this.prisma.category.findFirst({ where: { slug, deleted_at: null } });
  }

  create(data: Prisma.CategoryCreateInput) {
    return this.prisma.category.create({ data });
  }

  update(id: string, data: Prisma.CategoryUpdateInput) {
    return this.prisma.category.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.category.update({
      where: { id },
      data: { deleted_at: new Date(), status: 'archived' },
    });
  }

  /** Root → leaf path for product breadcrumbs (max 8 levels). */
  async breadcrumb(categoryId: string): Promise<Category[]> {
    const chain: Category[] = [];
    let current = await this.findById(categoryId);
    let guard = 0;
    while (current && guard < 8) {
      chain.unshift(current);
      if (!current.parent_id) break;
      current = await this.findById(current.parent_id);
      guard += 1;
    }
    return chain;
  }
}
