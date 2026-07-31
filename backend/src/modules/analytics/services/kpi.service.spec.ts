import { RuleEngine } from '../../../shared/rules';
import { ConditionEvaluator } from '../../../shared/rules/ConditionEvaluator';
import { OperatorRegistry } from '../../../shared/rules/OperatorRegistry';
import { KpiService } from './kpi.service';

describe('KpiService', () => {
  it('evaluates threshold via RuleEngine', () => {
    const rules = new RuleEngine(new ConditionEvaluator(new OperatorRegistry()));
    const service = new KpiService(
      {} as never,
      {} as never,
      rules,
      {} as never,
      {} as never,
      {} as never,
    );
    const ok = service.evaluateThreshold(
      { revenue: 100, aov: 50 },
      { field: 'aov', gte: 40 },
    );
    expect(ok.matched).toBe(true);
    const bad = service.evaluateThreshold(
      { aov: 10 },
      { field: 'aov', gte: 40 },
    );
    expect(bad.matched).toBe(false);
  });

  it('lists kpis from repository via cache', async () => {
    const rows = [
      {
        id: '1',
        domain: 'sales',
        period: 'daily',
        metric_date: new Date(),
        metrics_json: { revenue: 10 },
      },
    ];
    const repo = {
      client: {
        kpiSnapshot: { findMany: jest.fn(async () => rows) },
      },
    };
    const cache = {
      getOrSet: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
    };
    const service = new KpiService(
      repo as never,
      cache as never,
      new RuleEngine(new ConditionEvaluator(new OperatorRegistry())),
      {} as never,
      {} as never,
      {} as never,
    );
    const list = await service.list('daily');
    expect(list[0]?.domain).toBe('sales');
  });
});
