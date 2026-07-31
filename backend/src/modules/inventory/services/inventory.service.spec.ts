import { AppException } from '../../../core/errors/app.exception';
import { LockService } from '../../../shared/lock/lock.service';
import { InventoryService } from './inventory.service';

describe('InventoryService reservation', () => {
  const warehouses = {
    list: jest.fn(),
    findById: jest.fn(async (id: string) =>
      id === 'wh1'
        ? { id: 'wh1', code: 'HYD', name: 'Hyd', zones: [] }
        : null,
    ),
    findByCode: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findBin: jest.fn(),
    createLocation: jest.fn(),
  };

  const inventoryRows = [
    {
      id: 'inv1',
      warehouse_id: 'wh1',
      bin_id: 'bin1',
      variant_id: 'var1',
      available_quantity: 10,
      reserved_quantity: 0,
      reorder_level: 5,
    },
  ];

  const inventory = {
    client: {
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          inventory: {
            update: jest.fn(async () => ({})),
          },
          stockReservation: {
            update: jest.fn(async () => ({})),
          },
        };
        return fn(tx);
      }),
      inventory: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      warehouse: { findMany: jest.fn(async () => []) },
    },
    findRows: jest.fn(async () => inventoryRows),
    findRow: jest.fn(),
    createReservation: jest.fn(async () => ({
      id: 'res1',
      warehouse_id: 'wh1',
      variant_id: 'var1',
      quantity: 3,
      expires_at: new Date(),
      status: 'active',
    })),
    createMovement: jest.fn(),
    createAdjustment: jest.fn(),
    findReservation: jest.fn(),
    openLowStock: jest.fn(async () => null),
    upsertLowStockAlert: jest.fn(),
    listLowStock: jest.fn(),
    list: jest.fn(),
    stockSummary: jest.fn(),
    availabilityByVariant: jest.fn(),
  };

  const procurement = {
    client: {},
    findSerial: jest.fn(),
    findSerialById: jest.fn(),
    updateSerialRefurb: jest.fn(),
    createPurchaseOrder: jest.fn(),
    findPurchaseOrder: jest.fn(),
    findPoByNumber: jest.fn(),
    listPurchaseOrders: jest.fn(),
    findGrnByNumber: jest.fn(),
    findTransferByNumber: jest.fn(),
    listCycleCounts: jest.fn(),
    createCycleCount: jest.fn(),
  };

  const cache = {
    getOrSet: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
    invalidateStock: jest.fn(),
    invalidateWarehouses: jest.fn(),
    invalidateSerial: jest.fn(),
  };

  const locks = {
    withLock: jest.fn((_r: string, fn: () => Promise<unknown>) => fn()),
  };

  const events = {
    reserved: jest.fn(),
    released: jest.fn(),
    adjusted: jest.fn(),
    goodsReceived: jest.fn(),
    transferCompleted: jest.fn(),
    lowStock: jest.fn(),
  };

  const service = new InventoryService(
    warehouses as never,
    inventory as never,
    procurement as never,
    cache as never,
    locks as never,
    events as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    inventoryRows[0].available_quantity = 10;
    inventoryRows[0].reserved_quantity = 0;
    inventory.findRows.mockResolvedValue(inventoryRows);
  });

  it('reserves stock when available', async () => {
    const result = await service.reserve({
      warehouseId: 'wh1',
      variantId: 'var1',
      quantity: 3,
    });
    expect(result.id).toBe('res1');
    expect(locks.withLock).toHaveBeenCalled();
    expect(events.reserved).toHaveBeenCalled();
    expect(cache.invalidateStock).toHaveBeenCalledWith('wh1', 'var1');
  });

  it('rejects oversell', async () => {
    await expect(
      service.reserve({ warehouseId: 'wh1', variantId: 'var1', quantity: 50 }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('uses LockService resource key pattern', async () => {
    await service.reserve({ warehouseId: 'wh1', variantId: 'var1', quantity: 1 });
    const key = locks.withLock.mock.calls[0][0] as string;
    expect(key).toContain('inventory');
  });
});

describe('AdminInventoryController permissions', () => {
  it('requires inventory.write', () => {
    const { PERMISSIONS_KEY } = require('../../../common/decorators/permissions.decorator');
    const { ROLES_KEY } = require('../../../common/decorators/roles.decorator');
    const { AdminInventoryController } = require('../controllers/admin-inventory.controller');
    expect(Reflect.getMetadata(ROLES_KEY, AdminInventoryController)).toEqual(
      expect.arrayContaining(['admin', 'super_admin']),
    );
    expect(Reflect.getMetadata(PERMISSIONS_KEY, AdminInventoryController)).toEqual([
      'inventory.write',
    ]);
  });
});
