import { ShippingService } from './shipping.service';
import { AppException } from '../../../core/errors/app.exception';
import { shipmentStateMachine } from '../../../shared/state-machine';

describe('ShippingService status transitions', () => {
  it('uses StateMachineEngine for status updates', async () => {
    const stateMachine = {
      transition: jest.fn(
        async (
          def: unknown,
          opts: {
            apply: () => Promise<unknown>;
            audit?: (ctx: { from: string; to: string }) => Promise<void>;
            from: string;
            to: string;
          },
        ) => {
          expect(def).toBe(shipmentStateMachine);
          const result = await opts.apply();
          if (opts.audit) await opts.audit({ from: opts.from, to: opts.to });
          return { skipped: false, from: opts.from, to: opts.to, result };
        },
      ),
    };

    const shipment = {
      id: 's1',
      order_id: 'o1',
      status: 'created',
      tracking_number: 'AWB1',
      fulfillment_order_id: null,
      partner: { code: 'shiprocket' },
    };

    const repo = {
      findById: jest.fn(async () => shipment),
      update: jest.fn(async (_id: string, data: object) => ({
        ...shipment,
        ...data,
      })),
      appendTrackingEvent: jest.fn(),
      upsertTracking: jest.fn(),
      client: { fulfillmentOrder: { update: jest.fn() } },
    };

    const svc = new ShippingService(
      repo as never,
      { invalidateShipment: jest.fn() } as never,
      {
        withLock: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
      } as never,
      {
        cancelled: jest.fn(),
        delivered: jest.fn(),
        deliveryFailed: jest.fn(),
        inTransit: jest.fn(),
        outForDelivery: jest.fn(),
        returned: jest.fn(),
      } as never,
      { enqueue: jest.fn() } as never,
      stateMachine as never,
      { code: 'shiprocket' } as never,
    );

    const result = await svc.updateStatus('user1', 's1', { status: 'packed' });
    expect(stateMachine.transition).toHaveBeenCalled();
    expect(result.status).toBe('packed');
  });

  it('rejects missing shipment', async () => {
    const svc = new ShippingService(
      { findById: jest.fn(async () => null) } as never,
      { invalidateShipment: jest.fn() } as never,
      {
        withLock: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
      } as never,
      {} as never,
      {} as never,
      {} as never,
      { code: 'shiprocket' } as never,
    );
    await expect(
      svc.updateStatus('u', 'missing', { status: 'packed' }),
    ).rejects.toBeInstanceOf(AppException);
  });
});
