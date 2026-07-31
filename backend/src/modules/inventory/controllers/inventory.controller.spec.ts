import { InventoryController } from './inventory.controller';

describe('InventoryController', () => {
  const inventory = {
    listInventory: jest.fn(async () => ({ data: [], meta: {} })),
    getStock: jest.fn(async () => ({ available: 1 })),
    warehouseAvailability: jest.fn(async () => []),
    listWarehouses: jest.fn(async () => []),
    getWarehouse: jest.fn(async () => ({ id: 'w' })),
    serialLookup: jest.fn(async () => ({ serialNumber: 'S1' })),
  };
  const controller = new InventoryController(inventory as never);

  it('delegates stock', async () => {
    await controller.stock('w1', 'v1');
    expect(inventory.getStock).toHaveBeenCalledWith('w1', 'v1');
  });

  it('delegates serial lookup', async () => {
    await controller.serialLookup('SN-1');
    expect(inventory.serialLookup).toHaveBeenCalledWith('SN-1');
  });
});
