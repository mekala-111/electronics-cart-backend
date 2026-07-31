import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class WarrantyRepository {
  constructor(private readonly prisma: PrismaService) {}

  get client() {
    return this.prisma;
  }

  listPlans() {
    return this.prisma.warrantyPlan.findMany({
      where: { status: 'active', deleted_at: null },
      include: { provider: true },
      orderBy: { name: 'asc' },
    });
  }

  findPlan(id: string) {
    return this.prisma.warrantyPlan.findFirst({
      where: { id, deleted_at: null },
    });
  }

  findSerialByNumber(serial: string) {
    return this.prisma.serialNumber.findFirst({
      where: { serial_number: serial, deleted_at: null },
    });
  }

  findSerial(id: string) {
    return this.prisma.serialNumber.findFirst({
      where: { id, deleted_at: null },
    });
  }

  findRegistration(id: string) {
    return this.prisma.warrantyRegistration.findFirst({
      where: { id, deleted_at: null },
      include: { plan: true, serial_number: true },
    });
  }

  findActiveRegistrationBySerial(serialNumberId: string) {
    return this.prisma.warrantyRegistration.findFirst({
      where: {
        serial_number_id: serialNumberId,
        status: 'active',
        deleted_at: null,
      },
      include: { plan: true },
    });
  }

  findClaim(id: string) {
    return this.prisma.warrantyClaim.findFirst({
      where: { id, deleted_at: null },
      include: { documents: true, registration: true },
    });
  }

  audit(data: {
    action: string;
    actorId?: string;
    ticketId?: string;
    claimId?: string;
    repairJobId?: string;
    metadata?: object;
  }) {
    return this.prisma.serviceAuditLog.create({
      data: {
        action: data.action,
        actor_id: data.actorId,
        ticket_id: data.ticketId,
        claim_id: data.claimId,
        repair_job_id: data.repairJobId,
        metadata: data.metadata as never,
      },
    });
  }
}
