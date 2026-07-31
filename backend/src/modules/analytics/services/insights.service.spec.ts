import { InsightsService } from './insights.service';

describe('InsightsService funnels', () => {
  it('computes drop-off across funnel steps', async () => {
    const repo = {
      client: {
        conversionEvent: {
          groupBy: jest.fn(async () => [
            { funnel_step: 'landing', _count: { _all: 100 } },
            { funnel_step: 'product_view', _count: { _all: 80 } },
            { funnel_step: 'add_to_cart', _count: { _all: 40 } },
            { funnel_step: 'order_complete', _count: { _all: 10 } },
          ]),
          findMany: jest.fn(async () => [
            { properties: { campaignId: 'c1' } },
            { properties: { campaignId: 'c1' } },
          ]),
        },
      },
    };
    const cache = {
      getOrSet: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
    };
    const service = new InsightsService(repo as never, cache as never);
    const funnel = await service.funnels();
    expect(funnel.steps[0].count).toBe(100);
    expect(funnel.steps[1].conversionFromPrevPct).toBe(80);
    expect(funnel.overallConversionPct).toBe(10);
    expect(funnel.campaignAttribution.c1).toBe(2);
  });
});
