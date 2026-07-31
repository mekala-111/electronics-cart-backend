import { Injectable } from '@nestjs/common';
import { leafOperator, validateConditionTree } from './dsl/condition.dsl';
import { OperatorRegistry } from './OperatorRegistry';
import type {
  ConditionNode,
  EvaluateOptions,
  FactValue,
  Facts,
  LeafCondition,
} from './types/rule.types';
import { resolvePath } from './utils/facts.util';

export interface EvalInternal {
  matched: boolean;
  score: number;
  reasons: string[];
  errors: string[];
}

@Injectable()
export class ConditionEvaluator {
  constructor(private readonly operators: OperatorRegistry) {}

  evaluate(
    conditions: ConditionNode | null | undefined,
    facts: Facts,
    options: EvaluateOptions = {},
  ): EvalInternal {
    const collectReasons = options.collectReasons !== false;
    const shortCircuit = options.shortCircuit !== false;
    const matchScore = options.matchScore ?? 1;
    const pathCache = new Map<string, FactValue>();

    if (conditions === null || conditions === undefined) {
      return {
        matched: true,
        score: 0,
        reasons: collectReasons ? ['empty conditions → match'] : [],
        errors: [],
      };
    }

    const validation = validateConditionTree(conditions);
    if (validation.length) {
      return {
        matched: false,
        score: 0,
        reasons: [],
        errors: validation,
      };
    }

    return this.node(
      conditions,
      facts,
      pathCache,
      collectReasons,
      shortCircuit,
      matchScore,
    );
  }

  private node(
    node: ConditionNode,
    facts: Facts,
    cache: Map<string, FactValue>,
    collectReasons: boolean,
    shortCircuit: boolean,
    matchScore: number,
  ): EvalInternal {
    if ('all' in node) {
      return this.group(
        'all',
        node.all,
        facts,
        cache,
        collectReasons,
        shortCircuit,
        matchScore,
      );
    }
    if ('any' in node) {
      return this.group(
        'any',
        node.any,
        facts,
        cache,
        collectReasons,
        shortCircuit,
        matchScore,
      );
    }
    if ('not' in node) {
      const inner = this.node(
        node.not,
        facts,
        cache,
        collectReasons,
        shortCircuit,
        matchScore,
      );
      const matched = inner.errors.length === 0 && !inner.matched;
      return {
        matched,
        score: matched ? matchScore : 0,
        reasons: collectReasons
          ? [`not(${inner.reasons.join('; ') || '...'}) → ${matched}`]
          : [],
        errors: inner.errors,
      };
    }
    return this.leaf(
      node as LeafCondition,
      facts,
      cache,
      collectReasons,
      matchScore,
    );
  }

  private group(
    mode: 'all' | 'any',
    children: ConditionNode[],
    facts: Facts,
    cache: Map<string, FactValue>,
    collectReasons: boolean,
    shortCircuit: boolean,
    matchScore: number,
  ): EvalInternal {
    if (children.length === 0) {
      const matched = mode === 'all';
      return {
        matched,
        score: 0,
        reasons: collectReasons ? [`${mode}([]) → ${matched}`] : [],
        errors: [],
      };
    }

    let score = 0;
    const reasons: string[] = [];
    const errors: string[] = [];
    let matchedCount = 0;
    let failed = false;

    for (const child of children) {
      const r = this.node(
        child,
        facts,
        cache,
        collectReasons,
        shortCircuit,
        matchScore,
      );
      if (r.errors.length) errors.push(...r.errors);
      if (collectReasons) reasons.push(...r.reasons);

      if (mode === 'all') {
        if (r.errors.length || !r.matched) {
          failed = true;
          if (shortCircuit) {
            return { matched: false, score, reasons, errors };
          }
        } else {
          score += r.score;
          matchedCount += 1;
        }
      } else {
        if (r.matched && r.errors.length === 0) {
          matchedCount += 1;
          score += r.score;
          if (shortCircuit) {
            return { matched: true, score, reasons, errors: [] };
          }
        }
      }
    }

    if (mode === 'all') {
      return {
        matched: !failed && errors.length === 0,
        score,
        reasons,
        errors,
      };
    }
    const matched = matchedCount > 0;
    return {
      matched,
      score,
      reasons,
      errors: matched ? [] : errors,
    };
  }

  private leaf(
    leaf: LeafCondition,
    facts: Facts,
    cache: Map<string, FactValue>,
    collectReasons: boolean,
    matchScore: number,
  ): EvalInternal {
    const parsed = leafOperator(leaf as unknown as Record<string, unknown>);
    if ('error' in parsed) {
      return { matched: false, score: 0, reasons: [], errors: [parsed.error] };
    }

    const op = this.operators.get(parsed.name);
    if (!op) {
      return {
        matched: false,
        score: 0,
        reasons: [],
        errors: [`Unknown operator: ${parsed.name}`],
      };
    }

    const resolved = resolvePath(facts, leaf.field, cache);
    if (!resolved.ok) {
      return {
        matched: false,
        score: 0,
        reasons: [],
        errors: [resolved.error],
      };
    }

    const result = op.evaluate({
      field: leaf.field,
      actual: resolved.value,
      expected: parsed.expected as FactValue,
    });

    if (result.error) {
      return {
        matched: false,
        score: 0,
        reasons: collectReasons ? [result.reason] : [],
        errors: [result.error],
      };
    }

    return {
      matched: result.matched,
      score: result.matched ? matchScore : 0,
      reasons: collectReasons ? [result.reason] : [],
      errors: [],
    };
  }
}
