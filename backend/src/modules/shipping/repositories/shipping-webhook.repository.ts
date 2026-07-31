import { Injectable } from '@nestjs/common';
import { Prisma, WebhookProcessingStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ShippingWebhookRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByIdempotency(partnerId: string, key: string) {
    return this.prisma.shippingWebhook.findFirst({
      where: {
        partner_id: partnerId,
        idempotency_key: key,
        deleted_at: null,
      },
    });
  }

  create(data: Prisma.ShippingWebhookUncheckedCreateInput) {
    return this.prisma.shippingWebhook.create({ data });
  }

  mark(
    id: string,
    status: WebhookProcessingStatus,
    extra?: Prisma.ShippingWebhookUncheckedUpdateInput,
  ) {
    return this.prisma.shippingWebhook.update({
      where: { id },
      data: {
        processing_status: status,
        ...extra,
        ...(status === 'processed' ? { processed_at: new Date() } : {}),
      },
    });
  }

  findById(id: string) {
    return this.prisma.shippingWebhook.findFirst({
      where: { id, deleted_at: null },
    });
  }

  listRecent(take = 50) {
    return this.prisma.shippingWebhook.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
      take,
    });
  }
}
