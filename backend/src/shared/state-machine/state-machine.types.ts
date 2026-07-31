/**
 * Shared lifecycle transition engine.
 * Domains supply a definition + apply/audit callbacks; the engine validates,
 * runs hooks, and emits events after a successful transition.
 */

export type TransitionMap = Readonly<Record<string, readonly string[]>>;

export interface StateMachineDefinition {
  /** Logical machine name, e.g. `shipment`, `return`, `rma`. */
  name: string;
  /** from → allowed target statuses */
  transitions: TransitionMap;
  /** Allow from === to as a no-op success (default false). */
  allowSameState?: boolean;
}

export interface TransitionContext {
  machine: string;
  entityId: string;
  from: string;
  to: string;
  actorId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export type TransitionHook = (
  ctx: TransitionContext,
) => void | Promise<void>;

export interface TransitionOptions<T = void> {
  entityId: string;
  from: string;
  to: string;
  actorId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  /** Runs after validation, before apply. Throw to abort. */
  before?: TransitionHook;
  /** Persist the new status (required for side-effecting transitions). */
  apply: (ctx: TransitionContext) => Promise<T>;
  /**
   * Domain audit writer (e.g. payment_audit_logs / shipment status history).
   * Engine always emits a structured log; this persists durable audit rows.
   */
  audit?: TransitionHook;
  /** Runs after apply + audit + event publish. */
  after?: TransitionHook;
  /** Skip domain event emission (tests / internal sync). */
  silent?: boolean;
}

export interface TransitionResult<T = void> {
  from: string;
  to: string;
  skipped: boolean;
  result: T;
}
