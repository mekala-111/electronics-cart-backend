export type FactValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | FactValue[]
  | { [key: string]: FactValue };

export type Facts = Readonly<Record<string, FactValue>>;

export type RuleAction =
  | { op: 'set'; path: string; value: FactValue }
  | { op: 'add'; path: string; value: number }
  | { op: 'multiply'; path: string; value: number }
  | { op: 'percent'; path: string; value: number }
  | { op: 'append_tag'; path: string; value: string };

export interface EvaluateOptions {
  /** Collect reasons for every leaf (default true). */
  collectReasons?: boolean;
  /** Stop evaluating remaining siblings after short-circuit (default true). */
  shortCircuit?: boolean;
  /** Optional deterministic actions applied when matched. */
  actions?: RuleAction[];
  /** Soft score contribution when a leaf matches (default 1). */
  matchScore?: number;
}

export type OperatorName =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'matches_regex'
  | 'exists'
  | 'is_true'
  | 'is_false'
  | 'is_null'
  | 'is_not_null';

/** Leaf: { field, <operator>: expected } */
export type LeafCondition = {
  field: string;
} & Partial<Record<OperatorName, FactValue>>;

export type ConditionNode =
  | { all: ConditionNode[] }
  | { any: ConditionNode[] }
  | { not: ConditionNode }
  | LeafCondition;

export interface OperatorContext {
  field: string;
  actual: FactValue;
  expected: FactValue;
}

export interface OperatorEvalResult {
  matched: boolean;
  reason: string;
  error?: string;
}

export interface RuleOperator {
  readonly name: OperatorName;
  evaluate(ctx: OperatorContext): OperatorEvalResult;
}
