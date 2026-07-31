import type {
  OperatorContext,
  OperatorEvalResult,
  RuleOperator,
} from '../types/rule.types';
import {
  asString,
  compareOrdered,
  valuesEqual,
} from '../utils/facts.util';

function ok(matched: boolean, reason: string): OperatorEvalResult {
  return { matched, reason };
}

function fail(reason: string, error: string): OperatorEvalResult {
  return { matched: false, reason, error };
}

export class EqOperator implements RuleOperator {
  readonly name = 'eq' as const;
  evaluate(ctx: OperatorContext): OperatorEvalResult {
    const matched = valuesEqual(ctx.actual, ctx.expected);
    return ok(matched, `${ctx.field} == ${stringify(ctx.expected)}`);
  }
}

export class NeqOperator implements RuleOperator {
  readonly name = 'neq' as const;
  evaluate(ctx: OperatorContext): OperatorEvalResult {
    const matched = !valuesEqual(ctx.actual, ctx.expected);
    return ok(matched, `${ctx.field} != ${stringify(ctx.expected)}`);
  }
}

function cmpOp(
  name: string,
  symbol: string,
  pred: (cmp: number) => boolean,
): RuleOperator {
  return {
    name: name as RuleOperator['name'],
    evaluate(ctx) {
      const c = compareOrdered(ctx.actual, ctx.expected);
      if (!c.ok) {
        return fail(`${ctx.field} ${symbol} ${stringify(ctx.expected)}`, c.error);
      }
      return ok(pred(c.cmp), `${ctx.field} ${symbol} ${stringify(ctx.expected)}`);
    },
  };
}

export const GtOperator = cmpOp('gt', '>', (n) => n > 0);
export const GteOperator = cmpOp('gte', '>=', (n) => n >= 0);
export const LtOperator = cmpOp('lt', '<', (n) => n < 0);
export const LteOperator = cmpOp('lte', '<=', (n) => n <= 0);

export class BetweenOperator implements RuleOperator {
  readonly name = 'between' as const;
  evaluate(ctx: OperatorContext): OperatorEvalResult {
    const expected = ctx.expected;
    if (!Array.isArray(expected) || expected.length !== 2) {
      return fail(
        `${ctx.field} between ?`,
        'between requires [min, max]',
      );
    }
    const [min, max] = expected;
    const lo = compareOrdered(ctx.actual, min);
    const hi = compareOrdered(ctx.actual, max);
    if (!lo.ok) return fail(`${ctx.field} between`, lo.error);
    if (!hi.ok) return fail(`${ctx.field} between`, hi.error);
    const matched = lo.cmp >= 0 && hi.cmp <= 0;
    return ok(
      matched,
      `${ctx.field} between ${stringify(min)} and ${stringify(max)}`,
    );
  }
}

export class InOperator implements RuleOperator {
  readonly name = 'in' as const;
  evaluate(ctx: OperatorContext): OperatorEvalResult {
    if (!Array.isArray(ctx.expected)) {
      return fail(`${ctx.field} in ?`, 'in requires an array');
    }
    const matched = ctx.expected.some((v) => valuesEqual(ctx.actual, v));
    return ok(matched, `${ctx.field} in ${stringify(ctx.expected)}`);
  }
}

export class ContainsOperator implements RuleOperator {
  readonly name = 'contains' as const;
  evaluate(ctx: OperatorContext): OperatorEvalResult {
    if (Array.isArray(ctx.actual)) {
      const matched = ctx.actual.some((v) => valuesEqual(v, ctx.expected));
      return ok(matched, `${ctx.field} contains ${stringify(ctx.expected)}`);
    }
    const hay = asString(ctx.actual);
    const needle = asString(ctx.expected);
    if (hay === null || needle === null) {
      return fail(
        `${ctx.field} contains`,
        'contains requires string or array actual',
      );
    }
    return ok(hay.includes(needle), `${ctx.field} contains ${needle}`);
  }
}

export class StartsWithOperator implements RuleOperator {
  readonly name = 'starts_with' as const;
  evaluate(ctx: OperatorContext): OperatorEvalResult {
    const hay = asString(ctx.actual);
    const prefix = asString(ctx.expected);
    if (hay === null || prefix === null) {
      return fail(`${ctx.field} starts_with`, 'starts_with requires strings');
    }
    return ok(hay.startsWith(prefix), `${ctx.field} starts_with ${prefix}`);
  }
}

export class EndsWithOperator implements RuleOperator {
  readonly name = 'ends_with' as const;
  evaluate(ctx: OperatorContext): OperatorEvalResult {
    const hay = asString(ctx.actual);
    const suffix = asString(ctx.expected);
    if (hay === null || suffix === null) {
      return fail(`${ctx.field} ends_with`, 'ends_with requires strings');
    }
    return ok(hay.endsWith(suffix), `${ctx.field} ends_with ${suffix}`);
  }
}

export class RegexOperator implements RuleOperator {
  readonly name = 'matches_regex' as const;
  evaluate(ctx: OperatorContext): OperatorEvalResult {
    const hay = asString(ctx.actual);
    const pattern = asString(ctx.expected);
    if (hay === null || pattern === null) {
      return fail(`${ctx.field} matches_regex`, 'matches_regex requires strings');
    }
    // # ponytail: Re2-style safety — reject catastrophic patterns by length only
    if (pattern.length > 256) {
      return fail(`${ctx.field} matches_regex`, 'regex pattern too long');
    }
    try {
      const re = new RegExp(pattern);
      return ok(re.test(hay), `${ctx.field} matches /${pattern}/`);
    } catch {
      return fail(`${ctx.field} matches_regex`, 'invalid regex');
    }
  }
}

export class ExistsOperator implements RuleOperator {
  readonly name = 'exists' as const;
  evaluate(ctx: OperatorContext): OperatorEvalResult {
    const want = ctx.expected === undefined ? true : Boolean(ctx.expected);
    const present = ctx.actual !== undefined && ctx.actual !== null;
    const matched = want ? present : !present;
    return ok(matched, want ? `${ctx.field} exists` : `${ctx.field} does not exist`);
  }
}

export class IsTrueOperator implements RuleOperator {
  readonly name = 'is_true' as const;
  evaluate(ctx: OperatorContext): OperatorEvalResult {
    return ok(ctx.actual === true, `${ctx.field} is true`);
  }
}

export class IsFalseOperator implements RuleOperator {
  readonly name = 'is_false' as const;
  evaluate(ctx: OperatorContext): OperatorEvalResult {
    return ok(ctx.actual === false, `${ctx.field} is false`);
  }
}

export class IsNullOperator implements RuleOperator {
  readonly name = 'is_null' as const;
  evaluate(ctx: OperatorContext): OperatorEvalResult {
    return ok(ctx.actual === null || ctx.actual === undefined, `${ctx.field} is null`);
  }
}

export class IsNotNullOperator implements RuleOperator {
  readonly name = 'is_not_null' as const;
  evaluate(ctx: OperatorContext): OperatorEvalResult {
    return ok(ctx.actual !== null && ctx.actual !== undefined, `${ctx.field} is not null`);
  }
}

function stringify(v: unknown): string {
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export const DEFAULT_OPERATORS: RuleOperator[] = [
  new EqOperator(),
  new NeqOperator(),
  GtOperator,
  GteOperator,
  LtOperator,
  LteOperator,
  new BetweenOperator(),
  new InOperator(),
  new ContainsOperator(),
  new StartsWithOperator(),
  new EndsWithOperator(),
  new RegexOperator(),
  new ExistsOperator(),
  new IsTrueOperator(),
  new IsFalseOperator(),
  new IsNullOperator(),
  new IsNotNullOperator(),
];
