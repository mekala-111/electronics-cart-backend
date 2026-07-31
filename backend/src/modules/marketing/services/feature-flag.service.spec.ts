import { FeatureFlagService } from './growth.services';
import { RuleEngine } from '../../../shared/rules';
import { ConditionEvaluator } from '../../../shared/rules/ConditionEvaluator';
import { OperatorRegistry } from '../../../shared/rules/OperatorRegistry';

describe('FeatureFlagService', () => {
  it('evaluates conditions_json via RuleEngine', async () => {
    const flags = [
      {
        code: 'new_checkout',
        name: 'New Checkout',
        status: 'conditional',
        default_value: false,
        rules: [
          {
            conditions_json: { field: 'customer.tier', eq: 'gold' },
            enabled_value: true,
            rollout_percent: null,
            priority: 1,
          },
        ],
      },
    ];
    const repo = {
      client: {
        featureFlag: { findMany: jest.fn(async () => flags) },
      },
      audit: jest.fn(),
    };
    const cache = {
      getOrSet: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
      invalidateFlags: jest.fn(),
    };
    const events = { flagEvaluated: jest.fn() };
    const rules = new RuleEngine(new ConditionEvaluator(new OperatorRegistry()));
    const service = new FeatureFlagService(
      repo as never,
      cache as never,
      rules,
      events as never,
    );

    const gold = await service.listAndEvaluate('u1', {
      customer: { id: 'u1', tier: 'gold' },
    });
    expect(gold[0]?.enabled).toBe(true);

    const bronze = await service.listAndEvaluate('u2', {
      customer: { id: 'u2', tier: 'bronze' },
    });
    expect(bronze[0]?.enabled).toBe(false);
  });
});
