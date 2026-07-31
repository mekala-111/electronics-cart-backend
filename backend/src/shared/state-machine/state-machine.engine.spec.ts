import { StateMachineEngine } from './state-machine.engine';
import { shipmentStateMachine } from './definitions/shipment.definition';
import { returnStateMachine } from './definitions/return.definition';
import { AppException } from '../../core/errors/app.exception';

describe('StateMachineEngine', () => {
  const events = {
    publishFireAndForget: jest.fn(),
    publish: jest.fn(),
  };
  const engine = new StateMachineEngine(events as never);

  beforeEach(() => {
    events.publishFireAndForget.mockClear();
  });

  it('validates allowed shipment transitions', () => {
    expect(
      engine.canTransition(shipmentStateMachine, 'created', 'packed'),
    ).toBe(true);
    expect(
      engine.canTransition(shipmentStateMachine, 'delivered', 'packed'),
    ).toBe(false);
  });

  it('throws on illegal transition', () => {
    expect(() =>
      engine.assertTransition(shipmentStateMachine, 'cancelled', 'packed'),
    ).toThrow(AppException);
  });

  it('runs before → apply → audit → event → after', async () => {
    const order: string[] = [];
    const result = await engine.transition(shipmentStateMachine, {
      entityId: 'ship-1',
      from: 'created',
      to: 'packed',
      actorId: 'user-1',
      before: async () => {
        order.push('before');
      },
      apply: async () => {
        order.push('apply');
        return { ok: true };
      },
      audit: async () => {
        order.push('audit');
      },
      after: async () => {
        order.push('after');
      },
    });

    expect(order).toEqual(['before', 'apply', 'audit', 'after']);
    expect(result.skipped).toBe(false);
    expect(result.result).toEqual({ ok: true });
    expect(events.publishFireAndForget).toHaveBeenCalledTimes(1);
    const evt = events.publishFireAndForget.mock.calls[0][0];
    expect(evt.eventName).toBe('state.transitioned');
    expect(evt.payload.to).toBe('packed');
  });

  it('no-ops same-state when allowSameState', async () => {
    const apply = jest.fn();
    const result = await engine.transition(shipmentStateMachine, {
      entityId: 'ship-1',
      from: 'delivered',
      to: 'delivered',
      apply,
    });
    expect(result.skipped).toBe(true);
    expect(apply).not.toHaveBeenCalled();
    expect(events.publishFireAndForget).not.toHaveBeenCalled();
  });

  it('aborts when before throws', async () => {
    const apply = jest.fn();
    await expect(
      engine.transition(returnStateMachine, {
        entityId: 'ret-1',
        from: 'requested',
        to: 'approved',
        before: async () => {
          throw new Error('blocked');
        },
        apply,
      }),
    ).rejects.toThrow('blocked');
    expect(apply).not.toHaveBeenCalled();
  });

  it('lists allowed targets', () => {
    expect(engine.allowedTargets(shipmentStateMachine, 'created')).toEqual([
      'packed',
      'cancelled',
    ]);
  });
});
