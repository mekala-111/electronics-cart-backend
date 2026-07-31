import { Injectable } from '@nestjs/common';
import { Prisma, RefurbishmentStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ProcurementRepository {
  constructor(private readonly prisma: PrismaService) {}

  get client() {
    return this.prisma;
  }

  findSerial(serial: string) {
    return this.prisma.serialNumber.findFirst({
      where: { serial_number: serial, deleted_at: null },
      include: { warehouse: true, bin: true, variant: true, batch: true },
    });
  }

  findSerialById(id: string) {
    return this.prisma.serialNumber.findFirst({ where: { id, deleted_at: null } });
  }

  updateSerialRefurb(id: string, status: RefurbishmentStatus) {
    return this.prisma.serialNumber.update({
      where: { id },
      data: {
        refurbishment_status: status,
        status: status === 'ready_for_sale' ? 'refurbished_ready' : undefined,
      },
    });
  }

  createPurchaseOrder(data: Prisma.PurchaseOrderCreateInput) {
    return this.prisma.purchaseOrder.create({
      data,
      include: { items: true, supplier: true, warehouse: true },
    });
  }

  findPurchaseOrder(id: string) {
    return this.prisma.purchaseOrder.findFirst({
      where: { id, deleted_at: null },
      include: { items: true, supplier: true, warehouse: true },
    });
  }

  findPoByNumber(poNumber: string) {
    return this.prisma.purchaseOrder.findFirst({
      where: { po_number: poNumber, deleted_at: null },
    });
  }

  listPurchaseOrders() {
    return this.prisma.purchaseOrder.findMany({
      where: { deleted_at: null },
      include: { supplier: true, warehouse: true, _count: { select: { items: true } } },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  findGrnByNumber(grnNumber: string) {
    return this.prisma.goodsReceipt.findFirst({
      where: { grn_number: grnNumber, deleted_at: null },
    });
  }

  findTransferByNumber(transferNumber: string) {
    return this.prisma.stockTransfer.findFirst({
      where: { transfer_number: transferNumber, deleted_at: null },
    });
  }

  listCycleCounts(warehouseId?: string) {
    return this.prisma.cycleCountJob.findMany({
      where: {
        deleted_at: null,
        ...(warehouseId ? { warehouse_id: warehouseId } : {}),
      },
      include: { items: true, warehouse: true },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  createCycleCount(data: Prisma.CycleCountJobCreateInput) {
    return this.prisma.cycleCountJob.create({ data, include: { items: true } });
  }
}
