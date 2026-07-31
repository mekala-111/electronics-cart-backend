import { Injectable } from '@nestjs/common';
import { ConditionEvaluator } from './ConditionEvaluator';
import { errorResult, okResult, type RuleResult } from './RuleResult';
import type {
  ConditionNode,
  EvaluateOptions,
  Facts,
} from './types/rule.types';
import { applyActions } from './utils/actions.util';
import { deepFreezeFacts } from './utils/facts.util';

@Injectable()
export class RuleEngine {
  constructor(private readonly evaluator: ConditionEvaluator) {}

  /**
   * Pure evaluation: condition tree + immutable facts → RuleResult.
   * Never throws for malformed DSL / unknown fields — returns errors[].
   */
  evaluate(
    conditions: ConditionNode | null | undefined,
    facts: Facts,
    options: EvaluateOptions = {},
  ): RuleResult {
    try {
      const frozen = deepFreezeFacts(facts);
      const internal = this.evaluator.evaluate(conditions, frozen, options);

      if (internal.errors.length) {
        return errorResult(internal.errors, internal.reasons);
      }

      const result = okResult(internal.matched, internal.reasons, {
        score: internal.score,
      });

      if (internal.matched && options.actions?.length) {
        const { output, errors } = applyActions(frozen, options.actions);
        if (errors.length) {
          return {
            ...result,
            errors,
            metadata: { ...(result.metadata ?? {}), actionsFailed: true },
          };
        }
        return {
          ...result,
          metadata: {
            ...(result.metadata ?? {}),
            actionOutput: output,
          },
        };
      }

      return result;
    } catch (err) {
      return errorResult([
        `Unexpected evaluation error: ${err instanceof Error ? err.message : String(err)}`,
      ]);
    }
  }
}
