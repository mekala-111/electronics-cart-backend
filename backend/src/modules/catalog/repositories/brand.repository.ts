import { Injectable } from '@nestjs/common';
import { Brand, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class BrandRepository {
  constructor(private readonly prisma: PrismaService) {}

  listActive(): Promise<Brand[]> {
    return this.prisma.brand.findMany({
      where: { deleted_at: null, status: 'active' },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  }

  findById(id: string) {
    return this.prisma.brand.findFirst({ where: { id, deleted_at: null } });
  }

  findBySlug(slug: string) {
    return this.prisma.brand.findFirst({ where: { slug, deleted_at: null } });
  }

  create(data: Prisma.BrandCreateInput) {
    return this.prisma.brand.create({ data });
  }

  update(id: string, data: Prisma.BrandUpdateInput) {
    return this.prisma.brand.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.brand.update({
      where: { id },
      data: { deleted_at: new Date(), status: 'archived' },
    });
  }
}
