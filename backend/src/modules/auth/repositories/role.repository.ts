import { Injectable } from '@nestjs/common';
import { RecordStatus, Role } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

const notDeleted = { deleted_at: null };

@Injectable()
export class RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByCode(code: string): Promise<Role | null> {
    return this.prisma.role.findFirst({
      where: { code, ...notDeleted },
    });
  }

  async getUserRoleCodes(userId: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: {
        user_id: userId,
        status: RecordStatus.active,
        deleted_at: null,
        role: { deleted_at: null, status: RecordStatus.active },
      },
      select: { role: { select: { code: true } } },
    });

    return rows.map((row) => row.role.code);
  }

  async getUserPermissionCodes(userId: string): Promise<string[]> {
    const rows = await this.prisma.rolePermission.findMany({
      where: {
        deleted_at: null,
        status: RecordStatus.active,
        role: {
          deleted_at: null,
          status: RecordStatus.active,
          users: {
            some: {
              user_id: userId,
              status: RecordStatus.active,
              deleted_at: null,
            },
          },
        },
        permission: { deleted_at: null, status: RecordStatus.active },
      },
      select: { permission: { select: { code: true } } },
      distinct: ['permission_id'],
    });

    return rows.map((row) => row.permission.code);
  }
}
