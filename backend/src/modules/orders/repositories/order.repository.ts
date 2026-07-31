import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

const orderDetailInclude = {
  items: { where: { deleted_at: null }, include: { variant: true } },
  addresses: { where: { deleted_at: null } },
  status_history: { orderBy: { changed_at: 'desc' as const } },
  notes: { where: { deleted_at: null }, orderBy: { created_at: 'desc' as const } },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  get client() {
    return this.prisma;
  }

  findById(id: string) {
    return this.prisma.order.findFirst({
      where: { id, deleted_at: null },
      include: orderDetailInclude,
    });
  }

  findByNumber(orderNumber: string) {
    return this.prisma.order.findFirst({
      where: { order_number: orderNumber, deleted_at: null },
      include: orderDetailInclude,
    });
  }

  listByCustomer(customerId: string, take = 20) {
    return this.prisma.order.findMany({
      where: { customer_id: customerId, deleted_at: null },
      include: { items: { where: { deleted_at: null } } },
      orderBy: { created_at: 'desc' },
      take,
    });
  }

  listAdmin(filters: { status?: OrderStatus; skip: number; take: number }) {
    const where: Prisma.OrderWhereInput = {
      deleted_at: null,
      ...(filters.status ? { status: filters.status } : {}),
    };
    return this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: { items: true, customer: true },
        orderBy: { created_at: 'desc' },
        skip: filters.skip,
        take: filters.take,
      }),
    ]);
  }

  recentAddresses(customerId: string) {
    return this.prisma.orderAddress.findMany({
      where: {
        deleted_at: null,
        address_type: 'shipping',
        order: { customer_id: customerId, deleted_at: null },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });
  }

  async transitionStatus(
    orderId: string,
    from: OrderStatus | null,
    to: OrderStatus,
    note?: string,
    actorId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          status: to,
          ...(to === 'cancelled' ? { cancelled_at: new Date() } : {}),
          ...(to === 'confirmed' ? { placed_at: new Date() } : {}),
          updated_by: actorId,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          order_id: orderId,
          from_status: from ?? undefined,
          to_status: to,
          note,
          created_by: actorId,
          updated_by: actorId,
        },
      });
      return order;
    });
  }
}
