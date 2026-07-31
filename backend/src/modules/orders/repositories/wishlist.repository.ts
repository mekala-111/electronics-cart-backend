import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class WishlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string) {
    const existing = await this.prisma.wishlist.findFirst({
      where: { user_id: userId, deleted_at: null, status: 'active' },
      include: {
        items: {
          where: { deleted_at: null },
          include: { variant: true },
        },
      },
    });
    if (existing) return existing;
    return this.prisma.wishlist.create({
      data: { user_id: userId, name: 'Default' },
      include: { items: { include: { variant: true } } },
    });
  }

  addItem(wishlistId: string, variantId: string) {
    return this.prisma.wishlistItem.upsert({
      where: {
        wishlist_id_variant_id: { wishlist_id: wishlistId, variant_id: variantId },
      },
      create: { wishlist_id: wishlistId, variant_id: variantId },
      update: { deleted_at: null, status: 'active' },
    });
  }

  removeItem(itemId: string) {
    return this.prisma.wishlistItem.update({
      where: { id: itemId },
      data: { deleted_at: new Date(), status: 'archived' },
    });
  }
}
