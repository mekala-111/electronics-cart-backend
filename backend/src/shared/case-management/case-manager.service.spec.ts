import { CaseManager } from './case-manager.service';
import { CaseRegistry } from './case.registry';
import { InMemoryCaseStore } from './memory-case.store';
import { isResolveBreached, isResponseBreached } from './case-sla';
import { CASE_DEFINITIONS } from './case.registry';

describe('case SLA helpers', () => {
  const sla = CASE_DEFINITIONS.support.sla;

  it('detects response breach when unassigned', () => {
    const openedAt = new Date(Date.now() - 2 * 60 * 60_000);
    const snap = {
      kind: 'support' as const,
      id: '1',
      status: 'open',
      priority: 3 as const,
      openedAt,
    };
    expect(isResponseBreached(snap, sla)).toBe(true);
  });

  it('detects resolve breach', () => {
    const openedAt = new Date(Date.now() - 48 * 60 * 60_000);
    const snap = {
      kind: 'support' as const,
      id: '1',
      status: 'open',
      priority: 3 as const,
      openedAt,
      assigneeId: 'agent-1',
    };
    expect(
      isResolveBreached(snap, sla, CASE_DEFINITIONS.support.terminalStatuses),
    ).toBe(true);
  });
});

describe('CaseManager', () => {
  const events = {
    publishFireAndForget: jest.fn(),
    publish: jest.fn(),
  };

  function build() {
    const registry = new CaseRegistry();
    const memory = new InMemoryCaseStore();
    const stateMachine = {
      transition: jest.fn(
        async (
          _def: unknown,
          opts: {
            from: string;
            to: string;
            apply: () => Promise<unknown>;
            audit?: (ctx: { from: string; to: string }) => Promise<void>;
          },
        ) => {
          const result = await opts.apply();
          if (opts.audit) await opts.audit({ from: opts.from, to: opts.to });
          return { skipped: false, from: opts.from, to: opts.to, result };
        },
      ),
      canTransition: jest.fn(() => true),
    };
    const manager = new CaseManager(
      registry,
      stateMachine as never,
      events as never,
      memory,
    );
    return { manager, memory, stateMachine, events, registry };
  }

  beforeEach(() => {
    events.publishFireAndForget.mockClear();
  });

  it('opens, assigns, notes, transitions, timelines', async () => {
    const { manager, stateMachine } = build();
    const opened = manager.openSupportCase({ priority: 2 });
    expect(opened.status).toBe('open');

    const ref = { kind: 'support' as const, id: opened.id };
    await manager.assign(ref, 'tech-1', 'admin');
    await manager.addNote(ref, { body: 'Customer called', actorId: 'admin' });

    const next = await manager.transition(ref, 'assigned', {
      actorId: 'admin',
      reason: 'Routed to tech',
    });
    expect(next.status).toBe('assigned');
    expect(stateMachine.transition).toHaveBeenCalled();

    const timeline = await manager.timeline(ref);
    expect(timeline.some((e) => e.type === 'assigned')).toBe(true);
    expect(timeline.some((e) => e.type === 'note')).toBe(true);
    expect(timeline.some((e) => e.type === 'status_changed')).toBe(true);
  });

  it('escalates on SLA breach', async () => {
    const { manager, memory } = build();
    const opened = manager.openSupportCase({ priority: 1 });
    const ref = { kind: 'support' as const, id: opened.id };

    // Force past due
    const snap = await memory.load(ref);
    await memory.saveStatus(ref, snap!.status);
    const stale = {
      ...snap!,
      openedAt: new Date(Date.now() - 7 * 24 * 60 * 60_000),
      dueAt: new Date(Date.now() - 1000),
    };
    (memory as unknown as { cases: Map<string, unknown> }).cases.set(
      memory.key(ref),
      stale,
    );

    const result = await manager.evaluateSla(ref, { autoEscalate: true });
    expect(result.resolveBreached || result.responseBreached).toBe(true);
    expect(result.escalated).toBe(true);
    expect(events.publishFireAndForget).toHaveBeenCalled();
  });
});
