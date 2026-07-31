import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('builds executive widgets from domain metrics', async () => {
    const emptyFind = jest.fn(async () => []);
    const repo = {
      client: {
        salesMetrics: { findMany: emptyFind },
        paymentMetrics: { findMany: emptyFind },
        inventoryMetrics: { findMany: emptyFind },
        shippingMetrics: { findMany: emptyFind },
        serviceMetrics: { findMany: emptyFind },
        marketingMetrics: { findMany: emptyFind },
        liveMetric: { findMany: emptyFind },
        dashboardLayout: { findFirst: jest.fn(async () => null) },
      },
      audit: jest.fn(),
    };
    const cache = {
      getOrSet: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
      invalidateDashboards: jest.fn(),
    };
    const service = new DashboardService(
      repo as never,
      cache as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const dash = await service.getDashboard('executive');
    expect(dash.code).toBe('executive');
    expect(dash.widgets.length).toBeGreaterThan(3);
  });
});
