import { DomainEvent } from '../events/domain-event';
import type { TransitionContext } from './state-machine.types';

export class StateTransitionedEvent extends DomainEvent<
  TransitionContext & { skipped?: boolean }
> {
  static readonly eventName = 'state.transitioned';
  readonly eventName = StateTransitionedEvent.eventName;
}
