import { Injectable } from '@nestjs/common';
import { PaymentStatus, PaymentTxType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  get client() {
    return this.prisma;
  }

  findById(id: string) {
    return this.prisma.payment.findFirst({
      where: { id, deleted_at: null },
      include: { gateway: true, payment_method: true },
    });
  }

  findByOrderId(orderId: string) {
    return this.prisma.payment.findMany({
      where: { order_id: orderId, deleted_at: null },
      include: { gateway: true },
      orderBy: { created_at: 'desc' },
    });
  }

  findByGatewayPaymentId(gatewayPaymentId: string) {
    return this.prisma.payment.findFirst({
      where: { gateway_payment_id: gatewayPaymentId, deleted_at: null },
      include: { gateway: true },
    });
  }

  findPrimaryGateway() {
    return this.prisma.paymentGateway.findFirst({
      where: { is_primary: true, status: 'active', deleted_at: null },
    });
  }

  findGatewayByCode(code: 'razorpay') {
    return this.prisma.paymentGateway.findFirst({
      where: { code, status: 'active', deleted_at: null },
    });
  }

  create(data: Prisma.PaymentUncheckedCreateInput) {
    return this.prisma.payment.create({
      data,
      include: { gateway: true },
    });
  }

  update(id: string, data: Prisma.PaymentUncheckedUpdateInput) {
    return this.prisma.payment.update({
      where: { id },
      data,
      include: { gateway: true },
    });
  }

  nextAttemptNumber(paymentId: string) {
    return this.prisma.paymentAttempt
      .aggregate({
        where: { payment_id: paymentId, deleted_at: null },
        _max: { attempt_number: true },
      })
      .then((r) => (r._max.attempt_number ?? 0) + 1);
  }

  createAttempt(data: Prisma.PaymentAttemptUncheckedCreateInput) {
    return this.prisma.paymentAttempt.create({ data });
  }

  createTransaction(data: Prisma.PaymentTransactionUncheckedCreateInput) {
    return this.prisma.paymentTransaction.create({ data });
  }

  createEvent(paymentId: string, event: string, payload?: Prisma.InputJsonValue) {
    return this.prisma.paymentEvent.create({
      data: { payment_id: paymentId, event, payload },
    });
  }

  createAudit(data: {
    paymentId: string;
    action: string;
    actorId?: string;
    fromStatus?: PaymentStatus | null;
    toStatus?: PaymentStatus | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.paymentAuditLog.create({
      data: {
        payment_id: data.paymentId,
        action: data.action,
        actor_id: data.actorId,
        from_status: data.fromStatus ?? undefined,
        to_status: data.toStatus ?? undefined,
        metadata: data.metadata,
        created_by: data.actorId,
      },
    });
  }

  history(customerId: string, skip: number, take: number) {
    return this.prisma.payment.findMany({
      where: { customer_id: customerId, deleted_at: null },
      include: { gateway: true },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    });
  }

  historyCount(customerId: string) {
    return this.prisma.payment.count({
      where: { customer_id: customerId, deleted_at: null },
    });
  }

  listMethods() {
    return this.prisma.paymentMethod.findMany({
      where: { status: 'active', deleted_at: null },
      orderBy: { name: 'asc' },
    });
  }

  listSaved(customerId: string) {
    return this.prisma.savedPaymentMethod.findMany({
      where: { customer_id: customerId, status: 'active', deleted_at: null },
      orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
    });
  }
}

export type { PaymentStatus, PaymentTxType };
