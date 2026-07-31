import { AnalyticsController } from './analytics.controller';

describe('AnalyticsController', () => {
  it('delegates dashboard', async () => {
    const dashboards = {
      getDashboard: jest.fn(async () => ({ code: 'sales', widgets: [] })),
    };
    const ctrl = new AnalyticsController(
      dashboards as never,
      { list: jest.fn() } as never,
      { listSaved: jest.fn() } as never,
      {
        funnels: jest.fn(),
        trends: jest.fn(),
        cohorts: jest.fn(),
        ltv: jest.fn(),
        rfm: jest.fn(),
      } as never,
    );
    await ctrl.dashboard({ code: 'sales' });
    expect(dashboards.getDashboard).toHaveBeenCalledWith('sales');
  });
});
