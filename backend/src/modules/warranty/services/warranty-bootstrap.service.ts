import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  SERVICE_PERMISSIONS,
  WARRANTY_PERMISSIONS,
} from '../constants/warranty.constants';

/** Upsert warranty/service permissions without touching locked SQL seeds. */
@Injectable()
export class WarrantyBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(WarrantyBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      const defs = [
        {
          code: WARRANTY_PERMISSIONS.READ,
          module: 'warranty',
          action: 'read',
          description: 'View warranty',
        },
        {
          code: WARRANTY_PERMISSIONS.WRITE,
          module: 'warranty',
          action: 'write',
          description: 'Mutate warranty',
        },
        {
          code: SERVICE_PERMISSIONS.READ,
          module: 'service',
          action: 'read',
          description: 'View service ops',
        },
        {
          code: SERVICE_PERMISSIONS.WRITE,
          module: 'service',
          action: 'write',
          description: 'Mutate service ops',
        },
      ];

      for (const d of defs) {
        const existing = await this.prisma.permission.findFirst({
          where: { code: d.code, deleted_at: null },
        });
        if (existing) continue;
        await this.prisma.permission.create({ data: { ...d, status: 'active' } });
      }

      const codes = defs.map((d) => d.code);
      const adminRoles = await this.prisma.role.findMany({
        where: { code: { in: ['admin', 'super_admin'] }, deleted_at: null },
      });
      const perms = await this.prisma.permission.findMany({
        where: { code: { in: codes }, deleted_at: null },
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
      this.logger.warn(`warranty permission bootstrap skipped: ${String(err)}`);
    }
  }
}
