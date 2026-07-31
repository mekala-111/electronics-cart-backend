import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class VariantRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.productVariant.findFirst({ where: { id, deleted_at: null } });
  }

  findBySku(sku: string) {
    return this.prisma.productVariant.findFirst({ where: { sku, deleted_at: null } });
  }

  create(data: Prisma.ProductVariantCreateInput) {
    return this.prisma.productVariant.create({ data });
  }

  update(id: string, data: Prisma.ProductVariantUpdateInput) {
    return this.prisma.productVariant.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.productVariant.update({
      where: { id },
      data: { deleted_at: new Date(), status: 'archived' },
    });
  }

  setAttributeValues(variantId: string, attributeValueIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.variantAttributeValue.updateMany({
        where: { variant_id: variantId, deleted_at: null },
        data: { deleted_at: new Date(), status: 'archived' },
      });
      if (!attributeValueIds.length) return;
      const values = await tx.attributeValue.findMany({
        where: { id: { in: attributeValueIds }, deleted_at: null, status: 'active' },
      });
      if (values.length !== attributeValueIds.length) {
        throw new Error('INVALID_ATTRIBUTE_VALUES');
      }
      await tx.variantAttributeValue.createMany({
        data: attributeValueIds.map((attribute_value_id) => ({
          variant_id: variantId,
          attribute_value_id,
        })),
      });
    });
  }
}
