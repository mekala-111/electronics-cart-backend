import { PaymentsService } from './payments.service';
import { AppException } from '../../../core/errors/app.exception';

describe('PaymentsService', () => {
  const provider = {
    code: 'razorpay' as const,
    createOrder: jest.fn(async () => ({
      gatewayOrderId: 'order_mock_1',
      raw: { mock: true },
    })),
    authorize: jest.fn(async () => ({
      gatewayPaymentId: 'pay_mock_1',
      gatewaySignature: 'sig',
      status: 'authorized' as const,
      raw: {},
    })),
    capture: jest.fn(async () => ({
      gatewayPaymentId: 'pay_mock_1',
      status: 'captured' as const,
      raw: {},
    })),
    cancel: jest.fn(async () => ({ status: 'cancelled' as const, raw: {} })),
    refund: jest.fn(),
    verifyWebhookSignature: jest.fn(() => true),
  };

  const paymentRow = {
    id: 'pay-uuid',
    order_id: 'ord-uuid',
    customer_id: 'user-1',
    gateway_id: 'gw',
    payment_method_id: null,
    amount: 100,
    currency: 'INR',
    refunded_amount: 0,
    status: 'pending',
    gateway_order_id: 'order_mock_1',
    gateway_payment_id: null,
    gateway_signature: null,
    authorized_at: null,
    captured_at: null,
    failed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    gateway: { code: 'razorpay' },
  };

  function build() {
    const repo = {
      client: {
        order: {
          findFirst: jest.fn(async () => ({
            id: 'ord-uuid',
            customer_id: 'user-1',
            order_number: 'ORD-1',
          })),
        },
      },
      findPrimaryGateway: jest.fn(async () => ({
        id: 'gw',
        code: 'razorpay',
      })),
      findGatewayByCode: jest.fn(),
      create: jest.fn(async () => paymentRow),
      update: jest.fn(async (_id: string, data: object) => ({
        ...paymentRow,
        ...data,
      })),
      findById: jest.fn(async () => paymentRow),
      createAttempt: jest.fn(),
      createTransaction: jest.fn(),
      createEvent: jest.fn(),
      createAudit: jest.fn(),
      nextAttemptNumber: jest.fn(async () => 2),
      listMethods: jest.fn(async () => []),
      history: jest.fn(async () => []),
      historyCount: jest.fn(async () => 0),
    };
    const cache = {
      invalidatePayment: jest.fn(),
      getOrSet: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
    };
    const locks = {
      withLock: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
    };
    const events = {
      created: jest.fn(),
      pending: jest.fn(),
      authorized: jest.fn(),
      captured: jest.fn(),
      failed: jest.fn(),
      cancelled: jest.fn(),
    };
    const queues = { enqueue: jest.fn() };
    const config = {
      get: (key: string) => {
        if (key === 'payment.mock') return true;
        if (key === 'payment.serverCapture') return true;
        return undefined;
      },
    };

    const svc = new PaymentsService(
      repo as never,
      cache as never,
      locks as never,
      events as never,
      queues as never,
      config as never,
      provider as never,
    );
    return { svc, repo, provider, events };
  }

  it('creates payment via provider', async () => {
    const { svc, provider: p, events } = build();
    const result = await svc.create('user-1', {
      orderId: 'ord-uuid',
      amount: 100,
    });
    expect(p.createOrder).toHaveBeenCalled();
    expect(result.id).toBe('pay-uuid');
    expect(events.created).toHaveBeenCalled();
  });

  it('rejects negative amount', async () => {
    const { svc } = build();
    await expect(
      svc.create('user-1', { orderId: 'ord-uuid', amount: -1 }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('authorizes then captures', async () => {
    const { svc, repo } = build();
    repo.findById
      .mockResolvedValueOnce({ ...paymentRow, status: 'pending' })
      .mockResolvedValueOnce({
        ...paymentRow,
        status: 'authorized',
        gateway_payment_id: 'pay_mock_1',
      });
    const auth = await svc.authorize('pay-uuid', 'user-1');
    expect(auth.status).toBe('authorized');
    const cap = await svc.capture('pay-uuid', 'user-1');
    expect(cap.status).toBe('captured');
  });
});
