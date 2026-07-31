import { ConditionEvaluator } from '../ConditionEvaluator';
import { OperatorRegistry } from '../OperatorRegistry';
import { RuleEngine } from '../RuleEngine';
import type { ConditionNode, Facts } from '../types/rule.types';
import { DEFAULT_OPERATORS } from '../operators/operators';
import { validateConditionTree } from '../dsl/condition.dsl';

function engine() {
  const registry = new OperatorRegistry();
  const evaluator = new ConditionEvaluator(registry);
  return new RuleEngine(evaluator);
}

const sampleFacts: Facts = {
  customer: { tier: 'gold', id: 'c1', tags: ['vip', 'retail'] },
  cart: { total: 7500, items: 3 },
  payment: { method: 'upi' },
  shipment: { zone: 'west' },
  now: '2026-07-31T00:00:00.000Z',
  flag: true,
  empty: null,
};

describe('RuleEngine', () => {
  it('evaluates nested all/any example', () => {
    const conditions: ConditionNode = {
      all: [
        { field: 'cart.total', gte: 5000 },
        { field: 'customer.tier', eq: 'gold' },
        {
          any: [
            { field: 'payment.method', eq: 'upi' },
            { field: 'payment.method', eq: 'card' },
          ],
        },
      ],
    };
    const result = engine().evaluate(conditions, sampleFacts);
    expect(result.matched).toBe(true);
    expect(result.errors).toBeUndefined();
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(0);
  });

  it('short-circuits all on first false', () => {
    const conditions: ConditionNode = {
      all: [
        { field: 'cart.total', gte: 99999 },
        { field: 'customer.tier', eq: 'gold' },
      ],
    };
    const result = engine().evaluate(conditions, sampleFacts);
    expect(result.matched).toBe(false);
    expect(result.reasons.some((r) => r.includes('cart.total'))).toBe(true);
  });

  it('short-circuits any on first true', () => {
    const conditions: ConditionNode = {
      any: [
        { field: 'payment.method', eq: 'upi' },
        { field: 'payment.method', eq: 'card' },
      ],
    };
    const result = engine().evaluate(conditions, sampleFacts);
    expect(result.matched).toBe(true);
  });

  it('supports not', () => {
    const conditions: ConditionNode = {
      not: { field: 'customer.tier', eq: 'bronze' },
    };
    expect(engine().evaluate(conditions, sampleFacts).matched).toBe(true);
  });

  it('treats empty all as true and empty any as false', () => {
    expect(engine().evaluate({ all: [] }, sampleFacts).matched).toBe(true);
    expect(engine().evaluate({ any: [] }, sampleFacts).matched).toBe(false);
  });

  it('treats null/undefined conditions as match', () => {
    expect(engine().evaluate(null, sampleFacts).matched).toBe(true);
    expect(engine().evaluate(undefined, sampleFacts).matched).toBe(true);
  });

  it('returns errors for malformed DSL', () => {
    const result = engine().evaluate({ foo: 1 } as never, sampleFacts);
    expect(result.matched).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('returns errors for unknown operator', () => {
    const result = engine().evaluate(
      { field: 'cart.total', boom: 1 } as never,
      sampleFacts,
    );
    expect(result.matched).toBe(false);
    expect(result.errors?.[0]).toMatch(/unknown operator/i);
  });

  it('handles missing nested fields as non-match for eq', () => {
    const result = engine().evaluate(
      { field: 'customer.missing.deep', eq: 'x' },
      sampleFacts,
    );
    expect(result.matched).toBe(false);
  });

  it('does not mutate facts', () => {
    const facts: Facts = { cart: { total: 1 } };
    Object.freeze(facts);
    Object.freeze(facts.cart as object);
    const result = engine().evaluate(
      { field: 'cart.total', eq: 1 },
      facts,
      {
        actions: [{ op: 'set', path: 'cart.total', value: 99 }],
      },
    );
    expect(result.matched).toBe(true);
    expect((facts.cart as { total: number }).total).toBe(1);
    expect(
      (result.metadata?.actionOutput as { cart: { total: number } }).cart
        .total,
    ).toBe(99);
  });
});

describe('operators', () => {
  const e = engine();

  it.each([
    [{ field: 'cart.total', gt: 7000 }, true],
    [{ field: 'cart.total', lt: 7000 }, false],
    [{ field: 'cart.total', between: [7000, 8000] }, true],
    [{ field: 'payment.method', in: ['upi', 'card'] }, true],
    [{ field: 'customer.tags', contains: 'vip' }, true],
    [{ field: 'payment.method', starts_with: 'up' }, true],
    [{ field: 'payment.method', ends_with: 'pi' }, true],
    [{ field: 'payment.method', matches_regex: '^up' }, true],
    [{ field: 'customer.tier', exists: true }, true],
    [{ field: 'flag', is_true: true }, true],
    [{ field: 'flag', is_false: true }, false],
    [{ field: 'empty', is_null: true }, true],
    [{ field: 'payment.method', is_not_null: true }, true],
    [{ field: 'cart.total', neq: 0 }, true],
  ] as const)('%j → %s', (leaf, expected) => {
    expect(e.evaluate(leaf as ConditionNode, sampleFacts).matched).toBe(
      expected,
    );
  });

  it('compares dates', () => {
    const result = e.evaluate(
      { field: 'now', gte: '2026-01-01T00:00:00.000Z' },
      sampleFacts,
    );
    expect(result.matched).toBe(true);
  });
});

describe('OperatorRegistry', () => {
  it('registers defaults and lists them', () => {
    const reg = new OperatorRegistry();
    expect(reg.list().length).toBe(DEFAULT_OPERATORS.length);
    expect(reg.has('eq')).toBe(true);
    expect(reg.get('eq')?.name).toBe('eq');
  });
});

describe('validateConditionTree', () => {
  it('accepts valid tree', () => {
    expect(
      validateConditionTree({
        all: [{ field: 'a', eq: 1 }],
      }),
    ).toEqual([]);
  });

  it('rejects non-object', () => {
    expect(validateConditionTree([]).length).toBeGreaterThan(0);
  });
});

describe('performance', () => {
  it('evaluates 1000+ predicates', () => {
    const leaves: ConditionNode[] = [];
    for (let i = 0; i < 1200; i++) {
      leaves.push({ field: 'cart.total', gte: 1 });
    }
    const start = Date.now();
    const result = engine().evaluate({ all: leaves }, sampleFacts);
    const elapsed = Date.now() - start;
    expect(result.matched).toBe(true);
    expect(elapsed).toBeLessThan(2000);
  });
});

describe('actions', () => {
  it('supports set/add/multiply/percent/append_tag', () => {
    const result = engine().evaluate(
      { field: 'cart.total', gte: 1 },
      sampleFacts,
      {
        actions: [
          { op: 'add', path: 'cart.total', value: 100 },
          { op: 'multiply', path: 'cart.items', value: 2 },
          { op: 'percent', path: 'cart.total', value: 10 },
          { op: 'append_tag', path: 'customer.tags', value: 'promo' },
          { op: 'set', path: 'custom.discount', value: 50 },
        ],
      },
    );
    expect(result.matched).toBe(true);
    const out = result.metadata?.actionOutput as {
      cart: { total: number; items: number };
      customer: { tags: string[] };
      custom: { discount: number };
    };
    expect(out.cart.items).toBe(6);
    expect(out.customer.tags).toContain('promo');
    expect(out.custom.discount).toBe(50);
  });
});
