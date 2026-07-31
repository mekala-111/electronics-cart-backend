export interface RuleResult {
  matched: boolean;
  score?: number;
  reasons: string[];
  metadata?: Record<string, unknown>;
  /** Structured validation / evaluation errors (never unexpected throws). */
  errors?: string[];
}

export function okResult(
  matched: boolean,
  reasons: string[],
  extras?: Partial<RuleResult>,
): RuleResult {
  return {
    matched,
    reasons,
    ...extras,
  };
}

export function errorResult(errors: string[], reasons: string[] = []): RuleResult {
  return {
    matched: false,
    reasons,
    errors,
    metadata: { invalid: true },
  };
}
