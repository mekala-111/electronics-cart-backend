import { CheckoutService } from './checkout.service';

describe('CheckoutService saga wiring', () => {
  const cartItems = [
    {
      id: 'ci1',
      variant_id: 'v1',
      quantity: 1,
      unit_price: 100,
      variant: { sku: 'SKU-1', sale_price: 100 },
    },
  ];

  const carts = {
    requireCart: jest.fn(),
  };
  const cartRepo = {
    findActiveByUser: jest.fn(async () => ({
      id: 'cart1',
      currency: 'INR',
      status: 'active',
      items: cartItems,
    })),
    markConverted: jest.fn(),
  };
  const orders = {
    findById: jest.fn(async (id: string) => ({
      id,
      order_number: 'ORD-1',
      status: 'confirmed',
      currency: 'INR',
      subtotal: 100,
      discount_total: 0,
      tax_total: 0,
      shipping_charge: 0,
      grand_total: 100,
      placed_at: new Date(),
      cancelled_at: null,
      items: [],
    })),
    client: {
      order: {
        create: jest.fn(async () => ({
          id: 'ord1',
          order_number: 'ORD-1',
        })),
      },
      stockReservation: { updateMany: jest.fn() },
    },
    transitionStatus: jest.fn(),
  };
  const fulfillment = {
    findGiftCard: jest.fn(),
    findWallet: jest.fn(),
    createRiskScore: jest.fn(),
  };
  const inventory = {
    reserve: jest.fn(async () => ({ id: 'res1' })),
    releaseReservation: jest.fn(),
  };
  const payments = {
    createForCheckout: jest.fn(async () => ({ id: 'pay1', status: 'pending' })),
    authorize: jest.fn(async () => ({ id: 'pay1', status: 'authorized' })),
    capture: jest.fn(async () => ({ id: 'pay1', status: 'captured' })),
    voidOrCancel: jest.fn(),
  };
  const sagas = {
    run: jest.fn(async (_def: unknown, ctx: Record<string, unknown>) => {
      // simulate successful saga by invoking steps manually via definition
      const def = _def as {
        steps: Array<{
          name: string;
          execute: (c: Record<string, unknown>) => Promise<Record<string, unknown>>;
        }>;
      };
      let context = { ...ctx };
      for (const step of def.steps) {
        const patch = await step.execute(context);
        context = { ...context, ...patch };
      }
      return { status: 'completed', id: 'wf1', context };
    }),
  };
  const locks = {
    withLock: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
  };
  const events = {
    created: jest.fn(),
    confirmed: jest.fn(),
    cancelled: jest.fn(),
    returnRequested: jest.fn(),
    exchangeRequested: jest.fn(),
    fulfillmentCreated: jest.fn(),
  };
  const cache = {
    invalidateCart: jest.fn(),
    invalidateOrder: jest.fn(),
  };

  const config = {
    get: (key: string) => {
      if (key === 'payment.mock') return true;
      if (key === 'payment.serverCapture') return true;
      return undefined;
    },
  };

  const service = new CheckoutService(
    carts as never,
    cartRepo as never,
    orders as never,
    fulfillment as never,
    inventory as never,
    payments as never,
    sagas as never,
    locks as never,
    events as never,
    cache as never,
    config as never,
  );

  it('runs checkout through lock + saga', async () => {
    const result = await service.checkout('user1', {
      warehouseId: 'wh1',
      shipping: {
        fullName: 'A',
        line1: 'L1',
        city: 'Hyd',
        state: 'TS',
        postalCode: '500001',
      },
    });
    expect(locks.withLock).toHaveBeenCalled();
    expect(sagas.run).toHaveBeenCalled();
    expect(result.workflowId).toBe('wf1');
    expect(inventory.reserve).toHaveBeenCalled();
    expect(payments.createForCheckout).toHaveBeenCalled();
    expect(payments.authorize).toHaveBeenCalled();
    expect(payments.capture).toHaveBeenCalled();
    expect(events.created).toHaveBeenCalled();
    expect(events.confirmed).toHaveBeenCalled();
  });
});
