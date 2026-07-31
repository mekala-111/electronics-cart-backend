import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class RefundRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.RefundUncheckedCreateInput) {
    return this.prisma.refund.create({
      data,
      include: { items: true },
    });
  }

  update(id: string, data: Prisma.RefundUncheckedUpdateInput) {
    return this.prisma.refund.update({
      where: { id },
      data,
      include: { items: true },
    });
  }

  findByPayment(paymentId: string) {
    return this.prisma.refund.findMany({
      where: { payment_id: paymentId, deleted_at: null },
      include: { items: true },
      orderBy: { created_at: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.refund.findFirst({
      where: { id, deleted_at: null },
      include: { items: true },
    });
  }
}
