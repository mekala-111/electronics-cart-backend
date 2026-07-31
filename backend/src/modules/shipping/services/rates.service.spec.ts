import { RatesService } from '../services/rates.service';
import { volumetricWeightKg } from '../utils/weight.util';

describe('rate helpers', () => {
  it('computes volumetric weight', () => {
    expect(volumetricWeightKg(10, 10, 10)).toBe(0.2);
  });
});

describe('RatesService.estimate', () => {
  it('builds quotes from rate rows', async () => {
    const fromZone = { id: 'z1', code: 'HYD' };
    const toZone = { id: 'z2', code: 'DEL' };
    const repo = {
      client: {
        shippingZone: {
          findFirst: jest
            .fn()
            .mockResolvedValueOnce(fromZone)
            .mockResolvedValueOnce(toZone),
        },
        shippingRate: {
          findMany: jest.fn(async () => [
            {
              id: 'r1',
              from_zone_id: 'z1',
              to_zone_id: 'z2',
              min_weight_kg: 0.5,
              base_rate: 40,
              per_kg_rate: 10,
              currency: 'INR',
              rate_card: {
                partner_id: 'p1',
                service_id: 's1',
                partner: { code: 'shiprocket' },
                service: { name: 'Surface' },
              },
            },
          ]),
        },
      },
    };
    const cache = {
      getOrSet: (_k: string, fn: () => Promise<unknown>) => fn(),
    };
    const svc = new RatesService(repo as never, cache as never);
    const result = await svc.estimate({
      fromPincode: '500001',
      toPincode: '110001',
      weightKg: 1.5,
      cod: true,
    });
    expect(result.quotes.length).toBe(1);
    expect(result.quotes[0].total).toBeGreaterThan(40);
  });
});
