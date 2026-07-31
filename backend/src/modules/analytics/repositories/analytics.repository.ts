import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { TransactionContext } from '../../../shared/context/transaction-context';

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  get client() {
    return this.prisma;
  }

  audit(input: {
    entityType: string;
    entityId?: string;
    action: string;
    actorId?: string;
    previous?: object;
    next?: object;
  }) {
    return this.prisma.auditLog.create({
      data: {
        entity_type: input.entityType,
        entity_id: input.entityId,
        action: input.action,
        previous_values: (input.previous ?? undefined) as Prisma.InputJsonValue,
        new_values: (input.next ?? undefined) as Prisma.InputJsonValue,
        performed_by: input.actorId,
        request_id: TransactionContext.get()?.requestId,
      },
    });
  }

  async ensureMetricStream(code: string, name?: string) {
    const existing = await this.prisma.metricStream.findFirst({
      where: { code, deleted_at: null },
    });
    if (existing) return existing;
    return this.prisma.metricStream.create({
      data: {
        code,
        name: name ?? code,
        unit: 'count',
        status: 'active',
      },
    });
  }
}
