import { validateConditionTree } from '../../../shared/rules/dsl/condition.dsl';

export function assertAlertCondition(condition: unknown): string[] {
  return validateConditionTree(condition);
}
