import { RefundService } from './refund.service';
import { AppException } from '../../../core/errors/app.exception';

describe('RefundService', () => {
  it('rejects refund when not captured', async () => {
    const payments = {
      findById: jest.fn(async () => ({
        id: 'p1',
        status: 'pending',
        amount: 100,
        refunded_amount: 0,
        customer_id: 'u1',
      })),
    };
    const locks = {
      withLock: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
    };
    const svc = new RefundService(
      payments as never,
      {} as never,
      locks as never,
      {} as never,
      {} as never,
      {} as never,
      { refund: jest.fn() } as never,
    );
    await expect(
      svc.refund('p1', 'u1', { amount: 10 }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('processes partial refund', async () => {
    const payment = {
      id: 'p1',
      order_id: 'o1',
      status: 'captured',
      amount: 100,
      refunded_amount: 0,
      currency: 'INR',
      customer_id: 'u1',
      gateway_payment_id: 'pay_x',
    };
    const payments = {
      findById: jest.fn(async () => payment),
      client: { refundItem: { createMany: jest.fn() } },
      createTransaction: jest.fn(),
      update: jest.fn(),
      createAudit: jest.fn(),
      createEvent: jest.fn(),
    };
    const refunds = {
      create: jest.fn(async () => ({
        id: 'r1',
        refund_number: 'RFN-1',
        payment_id: 'p1',
        order_id: 'o1',
        refund_type: 'partial',
        amount: 40,
        currency: 'INR',
        status: 'processing',
        reason: null,
        gateway_refund_id: null,
        processed_at: null,
        created_at: new Date(),
      })),
      update: jest.fn(async (_id: string, data: object) => ({
        id: 'r1',
        refund_number: 'RFN-1',
        payment_id: 'p1',
        order_id: 'o1',
        refund_type: 'partial',
        amount: 40,
        currency: 'INR',
        status: 'processed',
        reason: null,
        gateway_refund_id: 'rfnd_1',
        processed_at: new Date(),
        created_at: new Date(),
        ...data,
      })),
    };
    const provider = {
      code: 'razorpay',
      refund: jest.fn(async () => ({
        gatewayRefundId: 'rfnd_1',
        status: 'processed',
        raw: {},
      })),
    };
    const locks = {
      withLock: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
    };
    const events = {
      refunded: jest.fn(),
      partiallyRefunded: jest.fn(),
    };
    const svc = new RefundService(
      payments as never,
      refunds as never,
      locks as never,
      events as never,
      { invalidatePayment: jest.fn() } as never,
      { enqueue: jest.fn() } as never,
      provider as never,
    );

    const result = await svc.refund('p1', 'u1', { amount: 40 });
    expect(result.status).toBe('processed');
    expect(events.partiallyRefunded).toHaveBeenCalled();
    expect(payments.update).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ status: 'partially_refunded' }),
    );
  });
});
