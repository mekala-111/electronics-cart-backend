import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditRepository } from '../repositories/audit.repository';

export interface AuditLogOptions {
  entityType?: string;
  entityId?: string;
  performedBy?: string;
  roleCode?: string;
  ipAddress?: string;
  device?: string;
  requestId?: string;
  previousValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async log(action: string, opts: AuditLogOptions = {}): Promise<void> {
    await this.auditRepository.create({
      entityType: opts.entityType ?? 'user',
      entityId: opts.entityId,
      action,
      previousValues: opts.previousValues,
      newValues: opts.newValues,
      performedBy: opts.performedBy,
      roleCode: opts.roleCode,
      ipAddress: opts.ipAddress,
      device: opts.device,
      requestId: opts.requestId,
    });
  }
}
