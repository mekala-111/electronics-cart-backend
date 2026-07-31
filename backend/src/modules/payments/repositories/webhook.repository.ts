import { Injectable } from '@nestjs/common';
import { Prisma, WebhookProcessingStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class WebhookRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByIdempotency(gatewayId: string, idempotencyKey: string) {
    return this.prisma.paymentWebhook.findFirst({
      where: {
        gateway_id: gatewayId,
        idempotency_key: idempotencyKey,
        deleted_at: null,
      },
    });
  }

  create(data: Prisma.PaymentWebhookUncheckedCreateInput) {
    return this.prisma.paymentWebhook.create({ data });
  }

  update(id: string, data: Prisma.PaymentWebhookUncheckedUpdateInput) {
    return this.prisma.paymentWebhook.update({ where: { id }, data });
  }

  mark(
    id: string,
    status: WebhookProcessingStatus,
    extra?: Prisma.PaymentWebhookUncheckedUpdateInput,
  ) {
    return this.update(id, {
      processing_status: status,
      ...extra,
      ...(status === 'processed' ? { processed_at: new Date() } : {}),
    });
  }
}
