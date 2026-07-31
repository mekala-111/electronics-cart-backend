import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class CollectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  listActive() {
    return this.prisma.collection.findMany({
      where: { deleted_at: null, status: 'active' },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  findById(id: string) {
    return this.prisma.collection.findFirst({
      where: { id, deleted_at: null },
      include: {
        products: {
          where: { deleted_at: null, status: 'active' },
          orderBy: { sort_order: 'asc' },
        },
      },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.collection.findFirst({ where: { slug, deleted_at: null } });
  }

  create(data: Prisma.CollectionCreateInput) {
    return this.prisma.collection.create({ data });
  }

  update(id: string, data: Prisma.CollectionUpdateInput) {
    return this.prisma.collection.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.collection.update({
      where: { id },
      data: { deleted_at: new Date(), status: 'archived' },
    });
  }

  replaceProducts(collectionId: string, productIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.collectionProduct.updateMany({
        where: { collection_id: collectionId, deleted_at: null },
        data: { deleted_at: new Date(), status: 'archived' },
      });
      if (!productIds.length) return;
      await tx.collectionProduct.createMany({
        data: productIds.map((product_id, i) => ({
          collection_id: collectionId,
          product_id,
          sort_order: i,
        })),
      });
    });
  }
}
