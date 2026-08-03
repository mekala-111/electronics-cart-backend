import { Injectable } from '@nestjs/common';
import { UserType } from '@prisma/client';
import { paginatedResult } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class CustomerAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, limit = 50) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const where = {
      deleted_at: null,
      user_type: UserType.customer,
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          mobile: true,
          status: true,
          created_at: true,
          last_login_at: true,
          _count: { select: { orders: true } },
          orders: {
            where: { deleted_at: null },
            select: { grand_total: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take,
      }),
    ]);

    return paginatedResult(
      rows.map((u) => {
        const ltv = u.orders.reduce((s, o) => s + Number(o.grand_total), 0);
        return {
          id: u.id,
          name: u.email?.split('@')[0] || u.mobile || 'Customer',
          email: u.email,
          mobile: u.mobile,
          status: u.status,
          orders: u._count.orders,
          ltv,
          createdAt: u.created_at,
          lastLoginAt: u.last_login_at,
        };
      }),
      Math.max(page, 1),
      take,
      total,
    );
  }
}
