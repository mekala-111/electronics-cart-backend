import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { SHIPPING_PERMISSIONS } from '../constants/shipping.constants';

/** # ponytail: boot upsert; move to seed SQL when unlock allows. */
@Injectable()
export class ShippingBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(ShippingBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      const defs = [
        {
          code: SHIPPING_PERMISSIONS.READ,
          module: 'shipping',
          action: 'read',
          description: 'View shipping',
        },
        {
          code: SHIPPING_PERMISSIONS.WRITE,
          module: 'shipping',
          action: 'write',
          description: 'Mutate shipping',
        },
      ];
      for (const d of defs) {
        const existing = await this.prisma.permission.findFirst({
          where: { code: d.code, deleted_at: null },
        });
        if (existing) continue;
        await this.prisma.permission.create({ data: { ...d, status: 'active' } });
      }
      const roles = await this.prisma.role.findMany({
        where: { code: { in: ['admin', 'super_admin'] }, deleted_at: null },
      });
      const perms = await this.prisma.permission.findMany({
        where: {
          code: { in: [SHIPPING_PERMISSIONS.READ, SHIPPING_PERMISSIONS.WRITE] },
          deleted_at: null,
        },
      });
      for (const role of roles) {
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
      this.logger.warn(`shipping permission bootstrap skipped: ${String(err)}`);
    }
  }
}
