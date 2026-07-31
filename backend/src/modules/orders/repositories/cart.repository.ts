import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

const cartInclude = {
  items: {
    where: { deleted_at: null },
    include: { variant: true },
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
        created_by: data.actorId,
        updated_by: data.actorId,
      },
      include: cartInclude,
    });
  }

  upsertItem(cartId: string, variantId: string, quantity: number, unitPrice: number, actorId?: string) {
    return this.prisma.cartItem.upsert({
      where: { cart_id_variant_id: { cart_id: cartId, variant_id: variantId } },
      create: {
        cart_id: cartId,
        variant_id: variantId,
        quantity,
        unit_price: unitPrice,
        created_by: actorId,
        updated_by: actorId,
      },
      update: {
        quantity,
        unit_price: unitPrice,
        deleted_at: null,
        status: 'active',
        updated_by: actorId,
      },
    });
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
