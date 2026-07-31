import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  CMS_PERMISSIONS,
  MARKETING_PERMISSIONS,
} from '../constants/marketing.constants';

@Injectable()
export class MarketingBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(MarketingBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      const defs = [
        {
          code: CMS_PERMISSIONS.READ,
          module: 'cms',
          action: 'read',
          description: 'View CMS',
        },
        {
          code: CMS_PERMISSIONS.WRITE,
          module: 'cms',
          action: 'write',
          description: 'Mutate CMS',
        },
        {
          code: MARKETING_PERMISSIONS.READ,
          module: 'marketing',
          action: 'read',
          description: 'View marketing',
        },
        {
          code: MARKETING_PERMISSIONS.WRITE,
          module: 'marketing',
          action: 'write',
          description: 'Mutate marketing',
        },
      ];
      for (const d of defs) {
        const existing = await this.prisma.permission.findFirst({
          where: { code: d.code, deleted_at: null },
        });
        if (!existing) {
          await this.prisma.permission.create({
            data: { ...d, status: 'active' },
          });
        }
      }
      const codes = defs.map((d) => d.code);
      const roles = await this.prisma.role.findMany({
        where: { code: { in: ['admin', 'super_admin'] }, deleted_at: null },
      });
      const perms = await this.prisma.permission.findMany({
        where: { code: { in: codes }, deleted_at: null },
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
      this.logger.warn(`marketing permission bootstrap skipped: ${String(err)}`);
    }
  }
}
