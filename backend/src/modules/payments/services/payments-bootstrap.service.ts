import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PAYMENTS_PERMISSIONS } from '../constants/payments.constants';

/**
 * Ensures payments.* permissions exist without touching locked SQL migrations.
 * # ponytail: upsert at boot; move to seed SQL when schema unlock allows.
 */
@Injectable()
export class PaymentsBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      const defs = [
        {
          code: PAYMENTS_PERMISSIONS.READ,
          module: 'payments',
          action: 'read',
          description: 'View payments',
        },
        {
          code: PAYMENTS_PERMISSIONS.WRITE,
          module: 'payments',
          action: 'write',
          description: 'Mutate payments',
        },
      ];

      for (const d of defs) {
        const existing = await this.prisma.permission.findFirst({
          where: { code: d.code, deleted_at: null },
        });
        if (existing) continue;
        await this.prisma.permission.create({ data: { ...d, status: 'active' } });
      }

      const adminRoles = await this.prisma.role.findMany({
        where: { code: { in: ['admin', 'super_admin'] }, deleted_at: null },
      });
      const perms = await this.prisma.permission.findMany({
        where: {
          code: { in: [PAYMENTS_PERMISSIONS.READ, PAYMENTS_PERMISSIONS.WRITE] },
          deleted_at: null,
        },
      });

      for (const role of adminRoles) {
        for (const perm of perms) {
          const link = await this.prisma.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: perm.id,
              deleted_at: null,
            },
          });
          if (link) continue;
          await this.prisma.rolePermission.create({
            data: { role_id: role.id, permission_id: perm.id },
          });
        }
      }
    } catch (err) {
      this.logger.warn(`payments permission bootstrap skipped: ${String(err)}`);
    }
  }
}
