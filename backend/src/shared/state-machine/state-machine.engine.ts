import { Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../core/errors/app.exception';
import { ErrorCodes } from '../../core/errors/error-codes';
import { TransactionContext } from '../context/transaction-context';
import { EventPublisher } from '../events/event-publisher';
import { StateTransitionedEvent } from './state-machine.events';
import type {
  StateMachineDefinition,
  TransitionContext,
  TransitionOptions,
  TransitionResult,
} from './state-machine.types';

@Injectable()
export class StateMachineEngine {
  private readonly logger = new Logger(StateMachineEngine.name);

  constructor(private readonly events: EventPublisher) {}

  canTransition(
    definition: StateMachineDefinition,
    from: string,
    to: string,
  ): boolean {
    if (from === to) return definition.allowSameState === true;
    const allowed = definition.transitions[from] ?? [];
    return allowed.includes(to);
  }

  assertTransition(
    definition: StateMachineDefinition,
    from: string,
    to: string,
  ): void {
    if (this.canTransition(definition, from, to)) return;
    throw new AppException(
      ErrorCodes.CONFLICT,
      `Invalid ${definition.name} transition ${from} → ${to}`,
      409,
    );
  }

  allowedTargets(
    definition: StateMachineDefinition,
    from: string,
  ): readonly string[] {
    return definition.transitions[from] ?? [];
  }

  /**
   * Validate → before → apply → audit → event → after.
   * Same-state transitions short-circuit when `allowSameState` is set.
   */
  async transition<T>(
    definition: StateMachineDefinition,
    options: TransitionOptions<T>,
  ): Promise<TransitionResult<T>> {
    this.assertTransition(definition, options.from, options.to);

    const ctx: TransitionContext = {
      machine: definition.name,
      entityId: options.entityId,
      from: options.from,
      to: options.to,
      actorId: options.actorId,
      reason: options.reason,
      metadata: options.metadata,
    };

    if (options.from === options.to && definition.allowSameState) {
      this.logger.debug(
        `${definition.name} ${options.entityId} already ${options.to} (noop)`,
      );
      return { from: options.from, to: options.to, skipped: true, result: undefined as T };
    }

    if (options.before) await options.before(ctx);

    const result = await options.apply(ctx);

    // Automatic structured audit log (always)
    this.logger.log(
      JSON.stringify({
        audit: 'state.transition',
        machine: definition.name,
        entityId: options.entityId,
        from: options.from,
        to: options.to,
        actorId: options.actorId,
        reason: options.reason,
        corr: TransactionContext.get()?.correlationId,
      }),
    );

    if (options.audit) await options.audit(ctx);

    if (!options.silent) {
      this.events.publishFireAndForget(
        new StateTransitionedEvent({ ...ctx, skipped: false }),
      );
    }

    if (options.after) await options.after(ctx);

    return {
      from: options.from,
      to: options.to,
      skipped: false,
      result,
    };
  }
}
