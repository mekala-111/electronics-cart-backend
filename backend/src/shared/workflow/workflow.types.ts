export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'compensating'
  | 'completed'
  | 'failed'
  | 'timed_out';

export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'compensated'
  | 'skipped';

export interface RetryPolicy {
  /** Max attempts including the first (default 1 = no retry). */
  maxAttempts?: number;
  /** Base delay ms between retries (default 100). */
  delayMs?: number;
  /** Multiply delay each attempt (default 2). */
  backoffFactor?: number;
}

export interface WorkflowStep<TContext = Record<string, unknown>> {
  name: string;
  execute: (ctx: TContext) => Promise<Partial<TContext> | void>;
  /** Undo this step if a later step fails. Runs in reverse order. */
  compensate?: (ctx: TContext) => Promise<void>;
  retry?: RetryPolicy;
  /** Per-step timeout ms (overrides workflow default). */
  timeoutMs?: number;
}

export interface WorkflowDefinition<TContext = Record<string, unknown>> {
  name: string;
  steps: WorkflowStep<TContext>[];
  /** Whole-workflow timeout ms (default 60_000). */
  timeoutMs?: number;
  retry?: RetryPolicy;
}

export interface StepRecord {
  name: string;
  status: StepStatus;
  attempts: number;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface WorkflowInstance<TContext = Record<string, unknown>> {
  id: string;
  name: string;
  status: WorkflowStatus;
  context: TContext;
  steps: StepRecord[];
  currentStepIndex: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
}

export class WorkflowError extends Error {
  constructor(
    message: string,
    public readonly workflowId: string,
    public readonly stepName?: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}
