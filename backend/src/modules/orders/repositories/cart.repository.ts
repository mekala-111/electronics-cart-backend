import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

const cartInclude = {
  items: {
    where: { deleted_at: null },
    include: {
      variant: true,
    },
  },
} as const;

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByUser(userId: string) {
    return this.prisma.cart.findFirst({
      where: { user_id: userId, status: 'active', deleted_at: null },
      include: cartInclude,
      orderBy: { updated_at: 'desc' },
    });
  }

  findActiveBySession(sessionKey: string) {
    return this.prisma.cart.findFirst({
      where: { session_key: sessionKey, status: 'active', deleted_at: null },
      include: cartInclude,
      orderBy: { updated_at: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.cart.findFirst({
      where: { id, deleted_at: null },
      include: cartInclude,
    });
  }

  create(data: { userId?: string; sessionKey?: string; actorId?: string }) {
    return this.prisma.cart.create({
      data: {
        user_id: data.userId,
        session_key: data.sessionKey,
        // Avoid FK errors when actorId is missing / non-user
        created_by: data.actorId,
        updated_by: data.actorId,
      },
      include: cartInclude,
    });
  }

  /**
   * Upsert via SQL so seed UUID-shaped ids (non-RFC version) still write.
   * Prisma Client Uuid validation rejects version-0 seed primary keys on write.
   */
  async upsertItem(
    cartId: string,
    variantId: string,
    quantity: number,
    unitPrice: number,
    actorId?: string,
  ) {
    await this.prisma.$executeRaw`
      INSERT INTO cart_items (
        id, cart_id, variant_id, quantity, unit_price, status,
        created_at, updated_at, deleted_at, created_by, updated_by
      ) VALUES (
        gen_random_uuid(),
        ${cartId}::uuid,
        ${variantId}::uuid,
        ${quantity},
        ${unitPrice},
        'active'::record_status,
        NOW(), NOW(), NULL,
        ${actorId ?? null}::uuid,
        ${actorId ?? null}::uuid
      )
      ON CONFLICT (cart_id, variant_id) DO UPDATE SET
        quantity = EXCLUDED.quantity,
        unit_price = EXCLUDED.unit_price,
        deleted_at = NULL,
        status = 'active'::record_status,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by
    `;
  }

  updateItemQty(itemId: string, quantity: number) {
    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  softDeleteItem(itemId: string) {
    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { deleted_at: new Date(), status: 'archived' },
    });
  }

  markConverted(cartId: string) {
    return this.prisma.cart.update({
      where: { id: cartId },
      data: { status: 'converted' },
    });
  }
}
