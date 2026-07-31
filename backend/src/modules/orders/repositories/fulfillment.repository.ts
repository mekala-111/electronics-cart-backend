import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class FulfillmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  get client() {
    return this.prisma;
  }

  findById(id: string) {
    return this.prisma.fulfillmentOrder.findFirst({
      where: { id, deleted_at: null },
      include: { items: true, pick_lists: true, packing_lists: true },
    });
  }

  createReturn(data: {
    returnNumber: string;
    orderId: string;
    reason?: string;
    items: { orderItemId: string; quantity: number; reason?: string }[];
    actorId?: string;
  }) {
    return this.prisma.return.create({
      data: {
        return_number: data.returnNumber,
        order_id: data.orderId,
        reason: data.reason,
        status: 'requested',
        created_by: data.actorId,
        updated_by: data.actorId,
        items: {
          create: data.items.map((i) => ({
            order_item_id: i.orderItemId,
            quantity: i.quantity,
            reason: i.reason,
            created_by: data.actorId,
            updated_by: data.actorId,
          })),
        },
      },
      include: { items: true },
    });
  }

  createExchange(data: {
    exchangeNumber: string;
    orderId: string;
    orderItemId: string;
    exchangeType: 'same_variant' | 'different_variant' | 'store_credit';
    fromVariantId: string;
    toVariantId?: string;
    reason?: string;
    actorId?: string;
  }) {
    return this.prisma.exchangeRequest.create({
      data: {
        exchange_number: data.exchangeNumber,
        order_id: data.orderId,
        order_item_id: data.orderItemId,
        exchange_type: data.exchangeType,
        from_variant_id: data.fromVariantId,
        to_variant_id: data.toVariantId,
        reason: data.reason,
        created_by: data.actorId,
        updated_by: data.actorId,
      },
    });
  }

  findGiftCard(code: string) {
    return this.prisma.giftCard.findFirst({
      where: { code, deleted_at: null, status: 'active' },
    });
  }

  findWallet(userId: string) {
    return this.prisma.wallet.findFirst({
      where: { user_id: userId, deleted_at: null, status: 'active' },
    });
  }

  createRiskScore(orderId: string, score: number, level: 'low' | 'medium' | 'high' | 'critical') {
    return this.prisma.orderRiskScore.create({
      data: { order_id: orderId, score, risk_level: level },
    });
  }

  listRiskEvents(orderId: string) {
    return this.prisma.riskEvent.findMany({
      where: { order_id: orderId, deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
  }

  listCancellationReasons() {
    return this.prisma.cancellationReason.findMany({
      where: { deleted_at: null, status: 'active' },
      orderBy: { label: 'asc' },
    });
  }
}
