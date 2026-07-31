import type { ConditionNode, OperatorName } from '../types/rule.types';

const LOGICAL = new Set(['all', 'any', 'not']);
const OPERATORS = new Set<string>([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'in',
  'contains',
  'starts_with',
  'ends_with',
  'matches_regex',
  'exists',
  'is_true',
  'is_false',
  'is_null',
  'is_not_null',
]);

export function validateConditionTree(
  node: unknown,
  path = '$',
): string[] {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) {
    return [`${path}: condition must be an object`];
  }
  const obj = node as Record<string, unknown>;
  const keys = Object.keys(obj);

  if (keys.includes('all')) {
    if (!Array.isArray(obj.all)) return [`${path}.all must be an array`];
    return (obj.all as unknown[]).flatMap((c, i) =>
      validateConditionTree(c, `${path}.all[${i}]`),
    );
  }
  if (keys.includes('any')) {
    if (!Array.isArray(obj.any)) return [`${path}.any must be an array`];
    return (obj.any as unknown[]).flatMap((c, i) =>
      validateConditionTree(c, `${path}.any[${i}]`),
    );
  }
  if (keys.includes('not')) {
    return validateConditionTree(obj.not, `${path}.not`);
  }

  if (typeof obj.field !== 'string' || !obj.field) {
    return [`${path}: leaf requires string field`];
  }

  const opKeys = keys.filter((k) => k !== 'field');
  if (opKeys.length === 0) {
    return [`${path}: leaf requires an operator`];
  }
  const unknownOps = opKeys.filter((k) => !OPERATORS.has(k) && !LOGICAL.has(k));
  if (unknownOps.length) {
    return [`${path}: unknown operator(s): ${unknownOps.join(', ')}`];
  }
  const knownOps = opKeys.filter((k) => OPERATORS.has(k));
  if (knownOps.length !== 1) {
    return [`${path}: leaf must have exactly one operator`];
  }
  return [];
}

export function leafOperator(
  leaf: Record<string, unknown>,
): { name: OperatorName; expected: unknown } | { error: string } {
  const opKeys = Object.keys(leaf).filter((k) => k !== 'field');
  if (opKeys.length !== 1) {
    return { error: 'leaf must have exactly one operator' };
  }
  const name = opKeys[0] as OperatorName;
  return { name, expected: leaf[name] };
}

export type { ConditionNode };
