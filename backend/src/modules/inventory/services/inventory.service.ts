import { Injectable } from '@nestjs/common';
import {
  AdjustmentReason,
  Prisma,
  RefurbishmentStatus,
  ReservationStatus,
} from '@prisma/client';
import { paginatedResult } from '../../../common/utils/pagination.util';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { LockService } from '../../../shared/lock/lock.service';
import {
  DEFAULT_RESERVATION_TTL_MINUTES,
  INVENTORY_CACHE,
} from '../constants/inventory.constants';
import { CreateLocationDto, CreateWarehouseDto, UpdateWarehouseDto } from '../dto/warehouse.dto';
import {
  AdjustStockDto,
  CreateGoodsReceiptDto,
  CreatePurchaseOrderDto,
  CreateTransferDto,
  InventoryQueryDto,
  ReserveStockDto,
  UpdateRefurbishmentDto,
} from '../dto/stock.dto';
import {
  GoodsReceivedEvent,
  InventoryAdjustedEvent,
  InventoryReleasedEvent,
  InventoryReservedEvent,
  LowStockDetectedEvent,
  TransferCompletedEvent,
} from '../events/inventory.events';
import { InventoryEventPublisher } from '../events/inventory-event.publisher';
import { InventoryRepository } from '../repositories/inventory.repository';
import { ProcurementRepository } from '../repositories/procurement.repository';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { InventoryCacheService } from './inventory-cache.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly warehouses: WarehouseRepository,
    private readonly inventory: InventoryRepository,
    private readonly procurement: ProcurementRepository,
    private readonly cache: InventoryCacheService,
    private readonly locks: LockService,
    private readonly events: InventoryEventPublisher,
  ) {}

  // ─── Reads ────────────────────────────────────────────────

  listWarehouses() {
    return this.cache.getOrSet(INVENTORY_CACHE.warehouses(), async () => {
      const rows = await this.warehouses.list();
      return rows.map((w) => ({
        id: w.id,
        name: w.name,
        code: w.code,
        city: w.city,
        state: w.state,
        country: w.country,
        status: w.status,
      }));
    });
  }

  getWarehouse(id: string) {
    return this.cache.getOrSet(INVENTORY_CACHE.warehouse(id), async () => {
      const w = await this.warehouses.findById(id);
      if (!w) throw new AppException(ErrorCodes.NOT_FOUND, 'Warehouse not found', 404);
      return {
        id: w.id,
        name: w.name,
        code: w.code,
        address: w.address,
        city: w.city,
        state: w.state,
        country: w.country,
        postalCode: w.postal_code,
        locations: w.zones.map((z) => ({
          zoneId: z.id,
          zoneCode: z.code,
          zoneName: z.name,
          racks: z.racks.map((r) => ({
            rackId: r.id,
            rackCode: r.code,
            bins: r.bins.map((b) => ({
              binId: b.id,
              binCode: b.code,
              barcode: b.barcode,
            })),
          })),
        })),
      };
    });
  }

  async listInventory(query: InventoryQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const [total, rows] = await this.inventory.list({
      warehouseId: query.warehouseId,
      variantId: query.variantId,
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginatedResult(
      rows.map((r) => ({
        id: r.id,
        warehouseId: r.warehouse_id,
        warehouseCode: r.warehouse.code,
        binId: r.bin_id,
        binCode: r.bin.code,
        variantId: r.variant_id,
        sku: r.variant.sku,
        available: r.available_quantity,
        reserved: r.reserved_quantity,
        damaged: r.damaged_quantity,
        inTransit: r.in_transit_quantity,
        reorderLevel: r.reorder_level,
      })),
      page,
      limit,
      total,
    );
  }

  async getStock(warehouseId: string, variantId: string) {
    await this.requireWarehouse(warehouseId);
    return this.cache.getOrSet(
      INVENTORY_CACHE.stock(warehouseId, variantId),
      async () => {
        const agg = await this.inventory.stockSummary(warehouseId, variantId);
        return {
          warehouseId,
          variantId,
          available: agg._sum.available_quantity ?? 0,
          reserved: agg._sum.reserved_quantity ?? 0,
          damaged: agg._sum.damaged_quantity ?? 0,
          inTransit: agg._sum.in_transit_quantity ?? 0,
        };
      },
    );
  }

  async warehouseAvailability(variantId: string) {
    return this.cache.getOrSet(INVENTORY_CACHE.availability(variantId), async () => {
      const groups = await this.inventory.availabilityByVariant(variantId);
      const whIds = groups.map((g) => g.warehouse_id);
      const warehouses = await this.inventory.client.warehouse.findMany({
        where: { id: { in: whIds }, deleted_at: null },
      });
      const byId = new Map(warehouses.map((w) => [w.id, w]));
      return groups.map((g) => {
        const w = byId.get(g.warehouse_id);
        return {
          warehouseId: g.warehouse_id,
          warehouseCode: w?.code ?? '',
          warehouseName: w?.name ?? '',
          variantId,
          available: g._sum.available_quantity ?? 0,
          reserved: g._sum.reserved_quantity ?? 0,
          damaged: g._sum.damaged_quantity ?? 0,
          inTransit: g._sum.in_transit_quantity ?? 0,
        };
      });
    });
  }

  async serialLookup(serial: string) {
    return this.cache.getOrSet(INVENTORY_CACHE.serial(serial), async () => {
      const row = await this.procurement.findSerial(serial);
      if (!row) throw new AppException(ErrorCodes.NOT_FOUND, 'Serial not found', 404);
      return {
        id: row.id,
        serialNumber: row.serial_number,
        barcode: row.barcode,
        imei: row.imei,
        status: row.status,
        refurbishmentStatus: row.refurbishment_status,
        warehouseId: row.warehouse_id,
        warehouseCode: row.warehouse?.code ?? null,
        binId: row.bin_id,
        variantId: row.variant_id,
        sku: row.variant.sku,
      };
    });
  }

  listLowStockAlerts() {
    return this.inventory.listLowStock();
  }

  listPurchaseOrders() {
    return this.procurement.listPurchaseOrders();
  }

  listCycleCounts(warehouseId?: string) {
    return this.procurement.listCycleCounts(warehouseId);
  }

  // ─── Warehouse admin ──────────────────────────────────────

  async createWarehouse(dto: CreateWarehouseDto, actorId?: string) {
    if (await this.warehouses.findByCode(dto.code)) {
      throw new AppException(ErrorCodes.CONFLICT, 'Warehouse code already exists', 409);
    }
    const wh = await this.warehouses.create({
      name: dto.name,
      code: dto.code,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      country: dto.country,
      postal_code: dto.postalCode,
      manager: dto.managerUserId ? { connect: { id: dto.managerUserId } } : undefined,
      created_by: actorId,
      updated_by: actorId,
    });
    await this.cache.invalidateWarehouses();
    return wh;
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto, actorId?: string) {
    await this.requireWarehouse(id);
    if (dto.code) {
      const existing = await this.warehouses.findByCode(dto.code);
      if (existing && existing.id !== id) {
        throw new AppException(ErrorCodes.CONFLICT, 'Warehouse code already exists', 409);
      }
    }
    const wh = await this.warehouses.update(id, {
      name: dto.name,
      code: dto.code,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      country: dto.country,
      postal_code: dto.postalCode,
      updated_by: actorId,
    });
    await this.cache.invalidateWarehouses();
    return wh;
  }

  async deleteWarehouse(id: string) {
    await this.requireWarehouse(id);
    await this.warehouses.softDelete(id);
    await this.cache.invalidateWarehouses();
    return { id, deleted: true };
  }

  async createLocation(dto: CreateLocationDto, actorId?: string) {
    await this.requireWarehouse(dto.warehouseId);
    const loc = await this.warehouses.createLocation({ ...dto, actorId });
    await this.cache.invalidateWarehouses();
    return loc;
  }

  // ─── Reserve / release ────────────────────────────────────

  async reserve(dto: ReserveStockDto, actorId?: string) {
    return this.locks.withLock(
      LockService.resourceKey('inventory', dto.warehouseId, dto.variantId),
      async () => {
        await this.requireWarehouse(dto.warehouseId);
        const rows = await this.inventory.findRows(dto.warehouseId, dto.variantId);
        const available = rows.reduce((s, r) => s + r.available_quantity, 0);
        if (available < dto.quantity) {
          throw new AppException(
            ErrorCodes.CONFLICT,
            `Insufficient stock: available ${available}, requested ${dto.quantity}`,
            409,
          );
        }

        let remaining = dto.quantity;
        const prisma = this.inventory.client;
        await prisma.$transaction(async (tx) => {
          for (const row of rows) {
            if (remaining <= 0) break;
            const take = Math.min(row.available_quantity, remaining);
            if (take <= 0) continue;
            await tx.inventory.update({
              where: { id: row.id },
              data: {
                available_quantity: { decrement: take },
                reserved_quantity: { increment: take },
                last_stock_update: new Date(),
                updated_by: actorId,
              },
            });
            remaining -= take;
          }
        });

        const ttl = dto.ttlMinutes ?? DEFAULT_RESERVATION_TTL_MINUTES;
        const reservation = await this.inventory.createReservation({
          warehouse: { connect: { id: dto.warehouseId } },
          variant: { connect: { id: dto.variantId } },
          quantity: dto.quantity,
          cart: dto.cartId ? { connect: { id: dto.cartId } } : undefined,
          order: dto.orderId ? { connect: { id: dto.orderId } } : undefined,
          session_key: dto.sessionKey,
          expires_at: new Date(Date.now() + ttl * 60_000),
          status: 'active',
          created_by: actorId,
          updated_by: actorId,
        });

        await this.inventory.createMovement({
          warehouseId: dto.warehouseId,
          variantId: dto.variantId,
          movementType: 'reservation',
          quantity: dto.quantity,
          referenceType: 'stock_reservation',
          referenceId: reservation.id,
          actorId,
        });

        await this.cache.invalidateStock(dto.warehouseId, dto.variantId);
        await this.maybeLowStock(dto.warehouseId, dto.variantId);

        this.events.reserved(
          new InventoryReservedEvent({
            reservationId: reservation.id,
            warehouseId: dto.warehouseId,
            variantId: dto.variantId,
            quantity: dto.quantity,
          }),
        );

        return {
          id: reservation.id,
          warehouseId: reservation.warehouse_id,
          variantId: reservation.variant_id,
          quantity: reservation.quantity,
          expiresAt: reservation.expires_at,
          status: reservation.status,
        };
      },
      { ttlMs: 15_000, waitMs: 5_000 },
    );
  }

  async releaseReservation(reservationId: string, actorId?: string) {
    const reservation = await this.inventory.findReservation(reservationId);
    if (!reservation) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Reservation not found', 404);
    }
    if (reservation.status !== 'active') {
      throw new AppException(
        ErrorCodes.CONFLICT,
        `Reservation is ${reservation.status}, cannot release`,
        409,
      );
    }

    return this.locks.withLock(
      LockService.resourceKey(
        'inventory',
        reservation.warehouse_id,
        reservation.variant_id,
      ),
      async () => {
        const rows = await this.inventory.findRows(
          reservation.warehouse_id,
          reservation.variant_id,
        );
        let remaining = reservation.quantity;
        await this.inventory.client.$transaction(async (tx) => {
          for (const row of rows) {
            if (remaining <= 0) break;
            const take = Math.min(row.reserved_quantity, remaining);
            if (take <= 0) continue;
            await tx.inventory.update({
              where: { id: row.id },
              data: {
                reserved_quantity: { decrement: take },
                available_quantity: { increment: take },
                last_stock_update: new Date(),
                updated_by: actorId,
              },
            });
            remaining -= take;
          }
          await tx.stockReservation.update({
            where: { id: reservationId },
            data: {
              status: 'released' as ReservationStatus,
              updated_by: actorId,
            },
          });
        });

        await this.inventory.createMovement({
          warehouseId: reservation.warehouse_id,
          variantId: reservation.variant_id,
          movementType: 'reservation_release',
          quantity: reservation.quantity,
          referenceType: 'stock_reservation',
          referenceId: reservationId,
          actorId,
        });

        await this.cache.invalidateStock(
          reservation.warehouse_id,
          reservation.variant_id,
        );

        this.events.released(
          new InventoryReleasedEvent({
            reservationId,
            warehouseId: reservation.warehouse_id,
            variantId: reservation.variant_id,
            quantity: reservation.quantity,
          }),
        );

        return { id: reservationId, status: 'released' };
      },
      { ttlMs: 15_000, waitMs: 5_000 },
    );
  }

  // ─── Adjust ───────────────────────────────────────────────

  async adjust(dto: AdjustStockDto, actorId?: string) {
    return this.locks.withLock(
      LockService.resourceKey('inventory', dto.warehouseId, dto.variantId),
      async () => {
        await this.requireWarehouse(dto.warehouseId);
        const bin = await this.warehouses.findBin(dto.binId);
        if (!bin || bin.rack.zone.warehouse_id !== dto.warehouseId) {
          throw new AppException(ErrorCodes.BAD_REQUEST, 'Bin does not belong to warehouse', 400);
        }

        let row = await this.inventory.findRow(dto.binId, dto.variantId);
        const nextAvailable = (row?.available_quantity ?? 0) + dto.quantityDelta;
        if (nextAvailable < 0) {
          throw new AppException(
            ErrorCodes.CONFLICT,
            'Adjustment would make available quantity negative',
            409,
          );
        }

        if (!row) {
          if (dto.quantityDelta < 0) {
            throw new AppException(ErrorCodes.CONFLICT, 'No inventory row to decrement', 409);
          }
          row = await this.inventory.client.inventory.create({
            data: {
              warehouse_id: dto.warehouseId,
              bin_id: dto.binId,
              variant_id: dto.variantId,
              available_quantity: dto.quantityDelta,
              last_stock_update: new Date(),
              created_by: actorId,
              updated_by: actorId,
            },
          });
        } else {
          row = await this.inventory.client.inventory.update({
            where: { id: row.id },
            data: {
              available_quantity: { increment: dto.quantityDelta },
              last_stock_update: new Date(),
              updated_by: actorId,
            },
          });
        }

        const reason = (dto.reason as AdjustmentReason) ?? 'correction';
        const adjustment = await this.inventory.createAdjustment({
          warehouseId: dto.warehouseId,
          variantId: dto.variantId,
          quantityDelta: dto.quantityDelta,
          reason,
          notes: dto.notes,
          actorId,
        });

        await this.inventory.createMovement({
          warehouseId: dto.warehouseId,
          variantId: dto.variantId,
          movementType: 'adjustment',
          quantity: dto.quantityDelta,
          referenceType: 'inventory_adjustment',
          referenceId: adjustment.id,
          notes: dto.notes,
          actorId,
        });

        await this.cache.invalidateStock(dto.warehouseId, dto.variantId);
        await this.maybeLowStock(dto.warehouseId, dto.variantId);

        this.events.adjusted(
          new InventoryAdjustedEvent({
            adjustmentId: adjustment.id,
            warehouseId: dto.warehouseId,
            variantId: dto.variantId,
            quantityDelta: dto.quantityDelta,
            reason,
          }),
        );

        return {
          id: adjustment.id,
          available: row.available_quantity,
          quantityDelta: dto.quantityDelta,
        };
      },
      { ttlMs: 15_000, waitMs: 5_000 },
    );
  }

  // ─── Goods receipt ────────────────────────────────────────

  async createGoodsReceipt(dto: CreateGoodsReceiptDto, actorId?: string) {
    if (await this.procurement.findGrnByNumber(dto.grnNumber)) {
      throw new AppException(ErrorCodes.CONFLICT, 'GRN number already exists', 409);
    }
    if (!dto.items?.length) {
      throw new AppException(ErrorCodes.BAD_REQUEST, 'GRN requires items', 400);
    }

    return this.locks.withLock(
      LockService.resourceKey('inventory', 'grn', dto.warehouseId),
      async () => {
        await this.requireWarehouse(dto.warehouseId);
        const prisma = this.procurement.client;

        const grn = await prisma.$transaction(async (tx) => {
          const receipt = await tx.goodsReceipt.create({
            data: {
              grn_number: dto.grnNumber,
              supplier_id: dto.supplierId,
              warehouse_id: dto.warehouseId,
              purchase_order_id: dto.purchaseOrderId,
              notes: dto.notes,
              status: 'posted',
              created_by: actorId,
              updated_by: actorId,
            },
          });

          for (const item of dto.items) {
            const bin = await tx.warehouseBin.findFirst({
              where: { id: item.binId, deleted_at: null },
              include: { rack: { include: { zone: true } } },
            });
            if (!bin || bin.rack.zone.warehouse_id !== dto.warehouseId) {
              throw new AppException(
                ErrorCodes.BAD_REQUEST,
                `Bin ${item.binId} not in warehouse`,
                400,
              );
            }

            await tx.goodsReceiptItem.create({
              data: {
                goods_receipt_id: receipt.id,
                variant_id: item.variantId,
                purchase_order_item_id: item.purchaseOrderItemId,
                quantity_received: item.quantityReceived,
                unit_cost: item.unitCost,
                created_by: actorId,
                updated_by: actorId,
              },
            });

            const existing = await tx.inventory.findFirst({
              where: {
                bin_id: item.binId,
                variant_id: item.variantId,
                deleted_at: null,
              },
            });
            if (existing) {
              await tx.inventory.update({
                where: { id: existing.id },
                data: {
                  available_quantity: { increment: item.quantityReceived },
                  last_stock_update: new Date(),
                  updated_by: actorId,
                },
              });
            } else {
              await tx.inventory.create({
                data: {
                  warehouse_id: dto.warehouseId,
                  bin_id: item.binId,
                  variant_id: item.variantId,
                  available_quantity: item.quantityReceived,
                  last_stock_update: new Date(),
                  created_by: actorId,
                  updated_by: actorId,
                },
              });
            }

            await tx.inventoryMovement.create({
              data: {
                warehouse_id: dto.warehouseId,
                variant_id: item.variantId,
                movement_type: 'purchase',
                quantity: item.quantityReceived,
                reference_type: 'goods_receipt',
                reference_id: receipt.id,
                created_by: actorId,
                updated_by: actorId,
              },
            });

            if (item.purchaseOrderItemId) {
              await tx.purchaseOrderItem.update({
                where: { id: item.purchaseOrderItemId },
                data: {
                  quantity_received: { increment: item.quantityReceived },
                },
              });
            }

            for (const serial of item.serialNumbers ?? []) {
              const dup = await tx.serialNumber.findFirst({
                where: { serial_number: serial, deleted_at: null },
              });
              if (dup) {
                throw new AppException(
                  ErrorCodes.CONFLICT,
                  `Serial already exists: ${serial}`,
                  409,
                );
              }
              await tx.serialNumber.create({
                data: {
                  serial_number: serial,
                  warehouse_id: dto.warehouseId,
                  bin_id: item.binId,
                  variant_id: item.variantId,
                  purchase_order_item_id: item.purchaseOrderItemId,
                  status: 'in_stock',
                  created_by: actorId,
                  updated_by: actorId,
                },
              });
            }
          }

          return receipt;
        });

        for (const item of dto.items) {
          await this.cache.invalidateStock(dto.warehouseId, item.variantId);
        }

        this.events.goodsReceived(
          new GoodsReceivedEvent({
            goodsReceiptId: grn.id,
            grnNumber: grn.grn_number,
            warehouseId: dto.warehouseId,
          }),
        );

        return {
          id: grn.id,
          grnNumber: grn.grn_number,
          status: grn.status,
          warehouseId: grn.warehouse_id,
        };
      },
      { ttlMs: 30_000, waitMs: 8_000 },
    );
  }

  // ─── Transfer ─────────────────────────────────────────────

  async createTransfer(dto: CreateTransferDto, actorId?: string) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new AppException(ErrorCodes.BAD_REQUEST, 'Warehouses must differ', 400);
    }
    if (await this.procurement.findTransferByNumber(dto.transferNumber)) {
      throw new AppException(ErrorCodes.CONFLICT, 'Transfer number already exists', 409);
    }

    const lockKey = [dto.fromWarehouseId, dto.toWarehouseId].sort().join(':');
    return this.locks.withLock(
      LockService.resourceKey('inventory', 'transfer', lockKey),
      async () => {
        await this.requireWarehouse(dto.fromWarehouseId);
        await this.requireWarehouse(dto.toWarehouseId);
        const prisma = this.procurement.client;

        const transfer = await prisma.$transaction(async (tx) => {
          const t = await tx.stockTransfer.create({
            data: {
              transfer_number: dto.transferNumber,
              from_warehouse_id: dto.fromWarehouseId,
              to_warehouse_id: dto.toWarehouseId,
              notes: dto.notes,
              status: 'received',
              shipped_at: new Date(),
              received_at: new Date(),
              created_by: actorId,
              updated_by: actorId,
            },
          });

          for (const item of dto.items) {
            const source = await tx.inventory.findFirst({
              where: {
                bin_id: item.fromBinId,
                variant_id: item.variantId,
                deleted_at: null,
              },
            });
            if (!source || source.available_quantity < item.quantity) {
              throw new AppException(
                ErrorCodes.CONFLICT,
                `Insufficient stock in source bin for variant ${item.variantId}`,
                409,
              );
            }
            if (source.warehouse_id !== dto.fromWarehouseId) {
              throw new AppException(ErrorCodes.BAD_REQUEST, 'fromBin not in from warehouse', 400);
            }

            const destBin = await tx.warehouseBin.findFirst({
              where: { id: item.toBinId, deleted_at: null },
              include: { rack: { include: { zone: true } } },
            });
            if (!destBin || destBin.rack.zone.warehouse_id !== dto.toWarehouseId) {
              throw new AppException(ErrorCodes.BAD_REQUEST, 'toBin not in to warehouse', 400);
            }

            await tx.inventory.update({
              where: { id: source.id },
              data: {
                available_quantity: { decrement: item.quantity },
                last_stock_update: new Date(),
                updated_by: actorId,
              },
            });

            const dest = await tx.inventory.findFirst({
              where: {
                bin_id: item.toBinId,
                variant_id: item.variantId,
                deleted_at: null,
              },
            });
            if (dest) {
              await tx.inventory.update({
                where: { id: dest.id },
                data: {
                  available_quantity: { increment: item.quantity },
                  last_stock_update: new Date(),
                  updated_by: actorId,
                },
              });
            } else {
              await tx.inventory.create({
                data: {
                  warehouse_id: dto.toWarehouseId,
                  bin_id: item.toBinId,
                  variant_id: item.variantId,
                  available_quantity: item.quantity,
                  last_stock_update: new Date(),
                  created_by: actorId,
                  updated_by: actorId,
                },
              });
            }

            await tx.stockTransferItem.create({
              data: {
                stock_transfer_id: t.id,
                variant_id: item.variantId,
                quantity: item.quantity,
                created_by: actorId,
                updated_by: actorId,
              },
            });

            await tx.inventoryMovement.create({
              data: {
                warehouse_id: dto.fromWarehouseId,
                variant_id: item.variantId,
                movement_type: 'transfer_out',
                quantity: item.quantity,
                reference_type: 'stock_transfer',
                reference_id: t.id,
                created_by: actorId,
                updated_by: actorId,
              },
            });
            await tx.inventoryMovement.create({
              data: {
                warehouse_id: dto.toWarehouseId,
                variant_id: item.variantId,
                movement_type: 'transfer_in',
                quantity: item.quantity,
                reference_type: 'stock_transfer',
                reference_id: t.id,
                created_by: actorId,
                updated_by: actorId,
              },
            });
          }

          return t;
        });

        for (const item of dto.items) {
          await this.cache.invalidateStock(dto.fromWarehouseId, item.variantId);
          await this.cache.invalidateStock(dto.toWarehouseId, item.variantId);
        }

        this.events.transferCompleted(
          new TransferCompletedEvent({
            transferId: transfer.id,
            transferNumber: transfer.transfer_number,
            fromWarehouseId: dto.fromWarehouseId,
            toWarehouseId: dto.toWarehouseId,
          }),
        );

        return {
          id: transfer.id,
          transferNumber: transfer.transfer_number,
          status: transfer.status,
        };
      },
      { ttlMs: 30_000, waitMs: 8_000 },
    );
  }

  // ─── Purchase orders ──────────────────────────────────────

  async createPurchaseOrder(dto: CreatePurchaseOrderDto, actorId?: string) {
    if (await this.procurement.findPoByNumber(dto.poNumber)) {
      throw new AppException(ErrorCodes.CONFLICT, 'PO number already exists', 409);
    }
    await this.requireWarehouse(dto.warehouseId);

    let subtotal = 0;
    const itemsData: Prisma.PurchaseOrderItemCreateWithoutPurchase_orderInput[] =
      dto.items.map((item) => {
        const line = item.quantityOrdered * item.unitCost;
        const tax = line * ((item.taxPercent ?? 0) / 100);
        subtotal += line + tax;
        return {
          variant: { connect: { id: item.variantId } },
          quantity_ordered: item.quantityOrdered,
          unit_cost: item.unitCost,
          tax_percent: item.taxPercent ?? 0,
          line_total: line + tax,
          created_by: actorId,
          updated_by: actorId,
        };
      });

    const po = await this.procurement.createPurchaseOrder({
      po_number: dto.poNumber,
      supplier: { connect: { id: dto.supplierId } },
      warehouse: { connect: { id: dto.warehouseId } },
      notes: dto.notes,
      status: 'approved',
      order_date: new Date(),
      subtotal,
      tax_total: 0,
      grand_total: subtotal,
      currency: 'INR',
      items: { create: itemsData },
      created_by: actorId,
      updated_by: actorId,
    });

    return {
      id: po.id,
      poNumber: po.po_number,
      status: po.status,
      grandTotal: Number(po.grand_total),
      itemCount: po.items.length,
    };
  }

  // ─── Refurbishment (serial status — no jobs table in v1.0) ─

  async updateRefurbishment(serialId: string, dto: UpdateRefurbishmentDto) {
    const serial = await this.procurement.findSerialById(serialId);
    if (!serial) throw new AppException(ErrorCodes.NOT_FOUND, 'Serial not found', 404);
    const updated = await this.procurement.updateSerialRefurb(
      serialId,
      dto.refurbishmentStatus as RefurbishmentStatus,
    );
    await this.cache.invalidateSerial(serial.serial_number);
    return {
      id: updated.id,
      serialNumber: updated.serial_number,
      refurbishmentStatus: updated.refurbishment_status,
      status: updated.status,
    };
  }

  async createCycleCount(warehouseId: string, jobNumber: string, actorId?: string) {
    await this.requireWarehouse(warehouseId);
    return this.procurement.createCycleCount({
      warehouse: { connect: { id: warehouseId } },
      job_number: jobNumber,
      status: 'planned',
      created_by: actorId,
      updated_by: actorId,
    });
  }

  // ─── helpers ──────────────────────────────────────────────

  private async requireWarehouse(id: string) {
    const w = await this.warehouses.findById(id);
    if (!w) throw new AppException(ErrorCodes.NOT_FOUND, 'Warehouse not found', 404);
    return w;
  }

  private async maybeLowStock(warehouseId: string, variantId: string) {
    const rows = await this.inventory.findRows(warehouseId, variantId);
    const available = rows.reduce((s, r) => s + r.available_quantity, 0);
    const reorder = Math.max(...rows.map((r) => r.reorder_level), 0);
    if (reorder <= 0 || available > reorder) return;
    const existing = await this.inventory.openLowStock(warehouseId, variantId);
    if (existing) return;
    const alert = await this.inventory.upsertLowStockAlert(
      warehouseId,
      variantId,
      available,
      reorder,
    );
    this.events.lowStock(
      new LowStockDetectedEvent({
        alertId: alert.id,
        warehouseId,
        variantId,
        available,
        reorderLevel: reorder,
      }),
    );
  }
}
