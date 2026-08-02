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

  /** Raw upsert — seed variant UUIDs are not always RFC v4 (Prisma write validation). */
  async addItem(wishlistId: string, variantId: string) {
    await this.prisma.$executeRaw`
      INSERT INTO wishlist_items (
        id, wishlist_id, variant_id, status, created_at, updated_at, deleted_at
      ) VALUES (
        gen_random_uuid(),
        ${wishlistId}::uuid,
        ${variantId}::uuid,
        'active'::record_status,
        NOW(), NOW(), NULL
      )
      ON CONFLICT (wishlist_id, variant_id) DO UPDATE SET
        deleted_at = NULL,
        status = 'active'::record_status,
        updated_at = NOW()
    `;
  }

  removeItem(itemId: string) {
    return this.prisma.wishlistItem.update({
      where: { id: itemId },
      data: { deleted_at: new Date(), status: 'archived' },
    });
  }
}
