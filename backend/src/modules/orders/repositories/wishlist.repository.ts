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

  /** Select-then-write — partial unique index + seed UUID-shaped variant ids. */
  async addItem(wishlistId: string, variantId: string) {
    const existing = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id::text AS id
      FROM wishlist_items
      WHERE wishlist_id = ${wishlistId}::uuid
        AND variant_id = ${variantId}::uuid
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (existing[0]?.id) {
      await this.prisma.$executeRaw`
        UPDATE wishlist_items SET
          deleted_at = NULL,
          status = 'active'::record_status,
          updated_at = NOW()
        WHERE id = ${existing[0].id}::uuid
      `;
      return;
    }

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
    `;
  }

  removeItem(itemId: string) {
    return this.prisma.wishlistItem.update({
      where: { id: itemId },
      data: { deleted_at: new Date(), status: 'archived' },
    });
  }
}
