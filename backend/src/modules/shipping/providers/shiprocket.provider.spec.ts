import { createHmac } from 'node:crypto';
import { ShiprocketProvider } from './shiprocket.provider';

describe('ShiprocketProvider (mock)', () => {
  const config = {
    get: (key: string) => {
      if (key === 'shipping.mock') return true;
      if (key === 'shipping.shiprocket.webhookSecret') return 'whsec';
      return undefined;
    },
  };
  const provider = new ShiprocketProvider(config as never);

  it('creates mock shipment with AWB', async () => {
    const result = await provider.createShipment({
      orderId: 'o1',
      shipmentNumber: 'SHP-1',
      weightKg: 1,
      pickupPincode: '500001',
      deliveryPincode: '110001',
      customerName: 'A',
      customerAddress: 'L1',
      customerCity: 'Hyd',
      customerState: 'TS',
    });
    expect(result.partnerShipmentRef).toMatch(/^SR_mock_/);
    expect(result.awbNumber).toBeTruthy();
  });

  it('generates mock label', async () => {
    const label = await provider.generateLabel({
      partnerShipmentRef: 'SR_mock_x',
    });
    expect(label.format).toBe('pdf');
    expect(label.labelUrl).toContain('mock');
  });

  it('verifies webhook hmac', () => {
    const body = '{"awb":"1"}';
    const sig = createHmac('sha256', 'whsec').update(body).digest('hex');
    expect(
      provider.verifyWebhookSignature({
        rawBody: body,
        signature: sig,
        secret: 'whsec',
      }),
    ).toBe(true);
  });
});
