import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    entityType: string;
    entityId?: string;
    action: string;
    previousValues?: Prisma.InputJsonValue;
    newValues?: Prisma.InputJsonValue;
    performedBy?: string;
    roleCode?: string;
    ipAddress?: string;
    device?: string;
    requestId?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        entity_type: data.entityType,
        entity_id: data.entityId,
        action: data.action,
        previous_values: data.previousValues,
        new_values: data.newValues,
        performed_by: data.performedBy,
        role_code: data.roleCode,
        ip_address: data.ipAddress,
        device: data.device,
        request_id: data.requestId,
      },
    });
  }
}
