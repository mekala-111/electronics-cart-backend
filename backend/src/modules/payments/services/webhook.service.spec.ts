import { createHmac } from 'node:crypto';
import { WebhookService } from './webhook.service';

describe('WebhookService', () => {
  it('rejects invalid signature', async () => {
    const provider = {
      verifyWebhookSignature: jest.fn(() => false),
    };
    const svc = new WebhookService(
      {} as never,
      { findGatewayByCode: jest.fn(async () => ({ id: 'gw' })) } as never,
      {} as never,
      { withLock: jest.fn() } as never,
      {} as never,
      {} as never,
      provider as never,
    );
    await expect(
      svc.receiveRazorpay({
        rawBody: '{}',
        signature: 'x',
        payload: { event: 'payment.captured' },
      }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('dedupes processed webhooks', async () => {
    const provider = {
      verifyWebhookSignature: jest.fn(() => true),
    };
    const webhooks = {
      findByIdempotency: jest.fn(async () => ({
        id: 'wh1',
        processing_status: 'processed',
      })),
      create: jest.fn(),
    };
    const locks = {
      withLock: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
    };
    const svc = new WebhookService(
      webhooks as never,
      { findGatewayByCode: jest.fn(async () => ({ id: 'gw' })) } as never,
      {} as never,
      locks as never,
      { webhookReceived: jest.fn() } as never,
      { enqueue: jest.fn() } as never,
      provider as never,
    );

    const body = JSON.stringify({ event: 'payment.captured', id: 'evt_1' });
    const sig = createHmac('sha256', 's').update(body).digest('hex');
    const result = await svc.receiveRazorpay({
      rawBody: body,
      signature: sig,
      payload: JSON.parse(body),
    });
    expect(result.duplicate).toBe(true);
    expect(webhooks.create).not.toHaveBeenCalled();
  });
});
