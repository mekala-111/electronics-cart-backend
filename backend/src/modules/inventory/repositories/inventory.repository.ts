import { Injectable } from '@nestjs/common';
import {
  AdjustmentReason,
  Prisma,
  ReservationStatus,
  StockMovementType,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  get client() {
    return this.prisma;
  }

  list(filters: { warehouseId?: string; variantId?: string; skip: number; take: number }) {
    const where: Prisma.InventoryWhereInput = {
      deleted_at: null,
      status: 'active',
      ...(filters.warehouseId ? { warehouse_id: filters.warehouseId } : {}),
      ...(filters.variantId ? { variant_id: filters.variantId } : {}),
    };
    return this.prisma.$transaction([
      this.prisma.inventory.count({ where }),
      this.prisma.inventory.findMany({
        where,
        include: { warehouse: true, bin: true, variant: true },
        orderBy: { updated_at: 'desc' },
        skip: filters.skip,
        take: filters.take,
      }),
    ]);
  }

  findRows(warehouseId: string, variantId: string) {
    return this.prisma.inventory.findMany({
      where: {
        warehouse_id: warehouseId,
        variant_id: variantId,
        deleted_at: null,
        status: 'active',
      },
      orderBy: { available_quantity: 'desc' },
    });
  }

  findRow(binId: string, variantId: string) {
    return this.prisma.inventory.findFirst({
      where: { bin_id: binId, variant_id: variantId, deleted_at: null },
    });
  }

  availabilityByVariant(variantId: string) {
    return this.prisma.inventory.groupBy({
      by: ['warehouse_id'],
      where: { variant_id: variantId, deleted_at: null, status: 'active' },
      _sum: {
        available_quantity: true,
        reserved_quantity: true,
        damaged_quantity: true,
        in_transit_quantity: true,
      },
    });
  }

  stockSummary(warehouseId: string, variantId: string) {
    return this.prisma.inventory.aggregate({
      where: {
        warehouse_id: warehouseId,
        variant_id: variantId,
        deleted_at: null,
        status: 'active',
      },
      _sum: {
        available_quantity: true,
        reserved_quantity: true,
        damaged_quantity: true,
        in_transit_quantity: true,
      },
    });
  }

  createMovement(data: {
    warehouseId: string;
    variantId: string;
    movementType: StockMovementType;
    quantity: number;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    actorId?: string;
  }) {
    return this.prisma.inventoryMovement.create({
      data: {
        warehouse_id: data.warehouseId,
        variant_id: data.variantId,
        movement_type: data.movementType,
        quantity: data.quantity,
        reference_type: data.referenceType,
        reference_id: data.referenceId,
        notes: data.notes,
        created_by: data.actorId,
        updated_by: data.actorId,
      },
    });
  }

  createReservation(data: Prisma.StockReservationCreateInput) {
    return this.prisma.stockReservation.create({ data });
  }

  findReservation(id: string) {
    return this.prisma.stockReservation.findFirst({
      where: { id, deleted_at: null },
    });
  }

  updateReservation(id: string, data: Prisma.StockReservationUpdateInput) {
    return this.prisma.stockReservation.update({ where: { id }, data });
  }

  createAdjustment(data: {
    warehouseId: string;
    variantId: string;
    quantityDelta: number;
    reason: AdjustmentReason;
    notes?: string;
    actorId?: string;
  }) {
    return this.prisma.inventoryAdjustment.create({
      data: {
        warehouse_id: data.warehouseId,
        variant_id: data.variantId,
        quantity_delta: data.quantityDelta,
        reason: data.reason,
        notes: data.notes,
        created_by: data.actorId,
        updated_by: data.actorId,
      },
    });
  }

  upsertLowStockAlert(warehouseId: string, variantId: string, available: number, reorder: number) {
    return this.prisma.lowStockAlert.create({
      data: {
        warehouse_id: warehouseId,
        variant_id: variantId,
        available_quantity: available,
        reorder_level: reorder,
        status: 'open',
      },
    });
  }

  openLowStock(warehouseId: string, variantId: string) {
    return this.prisma.lowStockAlert.findFirst({
      where: {
        warehouse_id: warehouseId,
        variant_id: variantId,
        status: 'open',
        deleted_at: null,
      },
    });
  }

  listLowStock() {
    return this.prisma.lowStockAlert.findMany({
      where: { deleted_at: null, status: 'open' },
      include: { warehouse: true, variant: true },
      orderBy: { created_at: 'desc' },
    });
  }
}
