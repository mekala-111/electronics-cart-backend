import { SagaCoordinator } from './saga-coordinator.service';
import { WorkflowStore } from './workflow.store';
import { orderPlacementDefinition } from './definitions/order-placement.definition';

describe('SagaCoordinator', () => {
  let coordinator: SagaCoordinator;
  let store: WorkflowStore;

  beforeEach(() => {
    store = new WorkflowStore();
    coordinator = new SagaCoordinator(store);
  });

  it('completes happy path and merges context', async () => {
    const result = await coordinator.run(
      {
        name: 'demo',
        steps: [
          {
            name: 'a',
            execute: async () => ({ a: 1 }),
          },
          {
            name: 'b',
            execute: async (ctx) => ({ b: (ctx.a as number) + 1 }),
          },
        ],
      },
      {},
    );

    expect(result.status).toBe('completed');
    expect(result.context).toEqual({ a: 1, b: 2 });
    expect(result.steps.every((s) => s.status === 'completed')).toBe(true);
    expect(store.get(result.id)?.status).toBe('completed');
  });

  it('compensates prior steps on failure', async () => {
    const log: string[] = [];
    const result = await coordinator.run(
      {
        name: 'compensate-demo',
        steps: [
          {
            name: 'reserve',
            execute: async () => {
              log.push('reserve');
              return { reservationId: 'r1' };
            },
            compensate: async () => {
              log.push('release');
            },
          },
          {
            name: 'pay',
            execute: async () => {
              log.push('pay');
              throw new Error('payment declined');
            },
            compensate: async () => {
              log.push('void');
            },
          },
        ],
      },
      {},
    );

    expect(result.status).toBe('failed');
    expect(result.error).toContain('payment declined');
    expect(log).toEqual(['reserve', 'pay', 'release']);
    expect(result.steps[0].status).toBe('compensated');
    expect(result.steps[1].status).toBe('failed');
  });

  it('retries transient failures', async () => {
    let attempts = 0;
    const result = await coordinator.run(
      {
        name: 'retry-demo',
        steps: [
          {
            name: 'flaky',
            retry: { maxAttempts: 3, delayMs: 1 },
            execute: async () => {
              attempts += 1;
              if (attempts < 3) throw new Error('transient');
              return { ok: true };
            },
          },
        ],
      },
      {},
    );

    expect(result.status).toBe('completed');
    expect(attempts).toBe(3);
    expect(result.steps[0].attempts).toBe(3);
  });

  it('times out a slow step', async () => {
    const result = await coordinator.run(
      {
        name: 'timeout-demo',
        timeoutMs: 5_000,
        steps: [
          {
            name: 'slow',
            timeoutMs: 30,
            execute: async () => {
              await new Promise((r) => setTimeout(r, 200));
            },
          },
        ],
      },
      {},
    );

    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/timed out/i);
  });

  it('order placement template compensates on payment failure', async () => {
    const log: string[] = [];
    const def = orderPlacementDefinition({
      reserveInventory: async () => {
        log.push('reserve');
        return { reservationId: 'res-1' };
      },
      releaseInventory: async () => {
        log.push('release');
      },
      initiatePayment: async () => {
        log.push('pay');
        throw new Error('gateway down');
      },
      voidPayment: async () => {
        log.push('void');
      },
      confirmOrder: async () => {
        log.push('confirm');
        return { orderId: 'ord-1' };
      },
      cancelOrder: async () => {
        log.push('cancel');
      },
    });

    const result = await coordinator.run(def, { userId: 'u1', amount: 100 });
    expect(result.status).toBe('failed');
    expect(log[0]).toBe('reserve');
    expect(log[log.length - 1]).toBe('release');
    expect(log.filter((x) => x === 'pay').length).toBeGreaterThanOrEqual(1);
    expect(log).not.toContain('confirm');
    expect(result.context.reservationId).toBe('res-1');
  });
});
