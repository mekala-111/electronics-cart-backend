import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  ANALYTICS_PERMISSIONS,
  REPORT_PERMISSIONS,
} from '../constants/analytics.constants';

@Injectable()
export class AnalyticsBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      const defs = [
        {
          code: ANALYTICS_PERMISSIONS.READ,
          module: 'analytics',
          action: 'read',
          description: 'View analytics dashboards and KPIs',
        },
        {
          code: ANALYTICS_PERMISSIONS.WRITE,
          module: 'analytics',
          action: 'write',
          description: 'Configure analytics, alerts, KPIs',
        },
        {
          code: REPORT_PERMISSIONS.READ,
          module: 'report',
          action: 'read',
          description: 'View saved reports',
        },
        {
          code: REPORT_PERMISSIONS.WRITE,
          module: 'report',
          action: 'write',
          description: 'Create reports, schedules, exports',
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
      this.logger.warn(`analytics permission bootstrap skipped: ${String(err)}`);
    }
  }
}
