import { RuleEngine } from '../../../shared/rules';
import { ConditionEvaluator } from '../../../shared/rules/ConditionEvaluator';
import { OperatorRegistry } from '../../../shared/rules/OperatorRegistry';
import { AlertService } from './alert.service';

describe('AlertService + RuleEngine', () => {
  it('triggers when condition matches', async () => {
    const historyCreate = jest.fn(async () => ({ id: 'h1' }));
    const repo = {
      client: {
        alertRule: {
          findMany: jest.fn(async () => [
            {
              id: 'r1',
              code: 'revenue_drop',
              severity: 'critical',
              cooldown_minutes: 15,
              status: 'active',
              condition_json: { field: 'revenue.deltaPct', lt: -10 },
            },
          ]),
        },
        alertHistory: {
          findFirst: jest.fn(async () => null),
          create: historyCreate,
        },
      },
      audit: jest.fn(),
    };
    const events = { alertTriggered: jest.fn() };
    const queues = { enqueue: jest.fn() };
    const rules = new RuleEngine(new ConditionEvaluator(new OperatorRegistry()));
    const service = new AlertService(
      repo as never,
      rules,
      queues as never,
      events as never,
    );

    const out = await service.evaluateAll({
      revenue: { deltaPct: -25 },
    });
    expect(out).toHaveLength(1);
    expect(historyCreate).toHaveBeenCalled();
    expect(events.alertTriggered).toHaveBeenCalled();
  });

  it('respects cooldown', async () => {
    const historyCreate = jest.fn();
    const repo = {
      client: {
        alertRule: {
          findMany: jest.fn(async () => [
            {
              id: 'r1',
              code: 'stock_critical',
              severity: 'warning',
              cooldown_minutes: 60,
              status: 'active',
              condition_json: { field: 'inventory.lowStock', gt: 0 },
            },
          ]),
        },
        alertHistory: {
          findFirst: jest.fn(async () => ({
            triggered_at: new Date(),
          })),
          create: historyCreate,
        },
      },
      audit: jest.fn(),
    };
    const rules = new RuleEngine(new ConditionEvaluator(new OperatorRegistry()));
    const service = new AlertService(
      repo as never,
      rules,
      { enqueue: jest.fn() } as never,
      { alertTriggered: jest.fn() } as never,
    );
    const out = await service.evaluateAll({ inventory: { lowStock: 5 } });
    expect(out).toHaveLength(0);
    expect(historyCreate).not.toHaveBeenCalled();
  });
});
