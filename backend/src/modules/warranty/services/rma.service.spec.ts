import { RmaService } from './rma.service';
import { AppException } from '../../../core/errors/app.exception';

describe('RmaService', () => {
  function build() {
    const repo = {
      client: {
        order: {
          findFirst: jest.fn(async () => ({
            id: 'ord-1',
            customer_id: 'user-1',
          })),
        },
        rmaRequest: {
          create: jest.fn(async () => ({
            id: 'rma-1',
            rma_number: 'RMA-1',
            status: 'requested',
            rma_type: 'warranty_repair',
            requested_at: new Date(),
          })),
          findFirst: jest.fn(async () => ({
            id: 'rma-1',
            status: 'requested',
            order_id: 'ord-1',
            rma_number: 'RMA-1',
            rma_type: 'refund',
            reason: null,
          })),
        },
        warehouse: {
          findFirst: jest.fn(async () => ({ id: 'wh-1' })),
        },
      },
      audit: jest.fn(),
    };
    const locks = {
      withLock: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
    };
    const cases = {
      registerStore: jest.fn(),
      recordOpened: jest.fn(),
      transition: jest.fn(async (_r: unknown, to: string) => ({ status: to })),
      timeline: jest.fn(async () => []),
    };
    const events = {
      rmaCreated: jest.fn(),
      rmaApproved: jest.fn(),
    };
    const sagas = {
      run: jest.fn(async () => ({ status: 'completed', id: 'wf-1' })),
    };
    const refunds = { refund: jest.fn() };
    const reverse = { createReverse: jest.fn(async () => ({ id: 'rev-1' })) };

    const service = new RmaService(
      repo as never,
      locks as never,
      cases as never,
      {} as never,
      events as never,
      sagas as never,
      refunds as never,
      reverse as never,
    );
    return { service, cases, events, reverse, sagas };
  }

  it('creates RMA and opens case', async () => {
    const { service, cases, events } = build();
    const result = await service.create('user-1', {
      rmaType: 'warranty_repair',
      orderId: 'ord-1',
    });
    expect(result.id).toBe('rma-1');
    expect(cases.recordOpened).toHaveBeenCalled();
    expect(events.rmaCreated).toHaveBeenCalled();
  });

  it('approves RMA and triggers reverse pickup', async () => {
    const { service, events, reverse } = build();
    const result = await service.patch('admin-1', 'rma-1', {
      status: 'approved',
    });
    expect(result.status).toBe('approved');
    expect(events.rmaApproved).toHaveBeenCalled();
    expect(reverse.createReverse).toHaveBeenCalled();
  });

  it('rejects refund when RMA not eligible', async () => {
    const { service } = build();
    await expect(
      service.requestRefund('admin-1', 'rma-1', {
        paymentId: 'pay-1',
        amount: 10,
      }),
    ).rejects.toBeInstanceOf(AppException);
  });
});
