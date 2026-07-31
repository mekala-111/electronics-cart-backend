import { createHmac } from 'node:crypto';
import { RazorpayProvider } from './razorpay.provider';

describe('RazorpayProvider (mock)', () => {
  const config = {
    get: (key: string) => {
      if (key === 'payment.mock') return true;
      if (key === 'payment.razorpay.keyId') return '';
      if (key === 'payment.razorpay.keySecret') return '';
      if (key === 'payment.razorpay.webhookSecret') return 'whsec';
      if (key === 'payment.razorpay.baseUrl') return 'https://api.razorpay.com/v1';
      return undefined;
    },
  };

  const provider = new RazorpayProvider(config as never);

  it('creates mock order', async () => {
    const order = await provider.createOrder({
      amount: 100,
      currency: 'INR',
      receipt: 'ord_test',
    });
    expect(order.gatewayOrderId).toMatch(/^order_mock_/);
  });

  it('authorizes and captures', async () => {
    const auth = await provider.authorize({
      gatewayOrderId: 'order_mock_x',
      amount: 100,
      currency: 'INR',
    });
    expect(auth.status).toBe('authorized');
    const cap = await provider.capture({
      gatewayPaymentId: auth.gatewayPaymentId,
      amount: 100,
      currency: 'INR',
    });
    expect(cap.status).toBe('captured');
  });

  it('refunds', async () => {
    const rf = await provider.refund({
      gatewayPaymentId: 'pay_mock_x',
      amount: 50,
      currency: 'INR',
    });
    expect(rf.gatewayRefundId).toMatch(/^rfnd_mock_/);
    expect(rf.status).toBe('processed');
  });

  it('verifies webhook signature', () => {
    const body = '{"event":"payment.captured"}';
    const sig = createHmac('sha256', 'whsec').update(body).digest('hex');
    expect(
      provider.verifyWebhookSignature({
        rawBody: body,
        signature: sig,
        secret: 'whsec',
      }),
    ).toBe(true);
    expect(
      provider.verifyWebhookSignature({
        rawBody: body,
        signature: 'bad',
        secret: 'whsec',
      }),
    ).toBe(false);
  });
});
