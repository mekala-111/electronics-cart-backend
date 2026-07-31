import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class WarehouseRepository {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.warehouse.findMany({
      where: { deleted_at: null, status: 'active' },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.warehouse.findFirst({
      where: { id, deleted_at: null },
      include: {
        zones: {
          where: { deleted_at: null },
          include: {
            racks: {
              where: { deleted_at: null },
              include: { bins: { where: { deleted_at: null } } },
            },
          },
        },
      },
    });
  }

  findByCode(code: string) {
    return this.prisma.warehouse.findFirst({ where: { code, deleted_at: null } });
  }

  create(data: Prisma.WarehouseCreateInput) {
    return this.prisma.warehouse.create({ data });
  }

  update(id: string, data: Prisma.WarehouseUpdateInput) {
    return this.prisma.warehouse.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.warehouse.update({
      where: { id },
      data: { deleted_at: new Date(), status: 'archived' },
    });
  }

  findBin(binId: string) {
    return this.prisma.warehouseBin.findFirst({
      where: { id: binId, deleted_at: null },
      include: { rack: { include: { zone: true } } },
    });
  }

  async createLocation(input: {
    warehouseId: string;
    zoneCode: string;
    zoneName?: string;
    rackCode: string;
    binCode: string;
    binBarcode?: string;
    actorId?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      let zone = await tx.warehouseZone.findFirst({
        where: {
          warehouse_id: input.warehouseId,
          code: input.zoneCode,
          deleted_at: null,
        },
      });
      if (!zone) {
        zone = await tx.warehouseZone.create({
          data: {
            warehouse_id: input.warehouseId,
            code: input.zoneCode,
            name: input.zoneName,
            created_by: input.actorId,
            updated_by: input.actorId,
          },
        });
      }
      let rack = await tx.warehouseRack.findFirst({
        where: { zone_id: zone.id, code: input.rackCode, deleted_at: null },
      });
      if (!rack) {
        rack = await tx.warehouseRack.create({
          data: {
            zone_id: zone.id,
            code: input.rackCode,
            created_by: input.actorId,
            updated_by: input.actorId,
          },
        });
      }
      const bin = await tx.warehouseBin.create({
        data: {
          rack_id: rack.id,
          code: input.binCode,
          barcode: input.binBarcode,
          created_by: input.actorId,
          updated_by: input.actorId,
        },
      });
      return { zone, rack, bin };
    });
  }
}
