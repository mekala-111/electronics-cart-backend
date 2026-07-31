import { TransactionContext } from './transaction-context';

describe('TransactionContext', () => {
  it('isolates async scopes', async () => {
    const seen: string[] = [];
    await Promise.all([
      TransactionContext.runAsync(
        { correlationId: 'a', requestId: 'a' },
        async () => {
          await new Promise((r) => setTimeout(r, 10));
          seen.push(TransactionContext.get()!.correlationId);
        },
      ),
      TransactionContext.runAsync(
        { correlationId: 'b', requestId: 'b' },
        async () => {
          seen.push(TransactionContext.get()!.correlationId);
        },
      ),
    ]);
    expect(seen).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('patches workflowId on active context', () => {
    TransactionContext.run({ correlationId: 'c', requestId: 'r' }, () => {
      TransactionContext.patch({ workflowId: 'wf-1', userId: 'u1' });
      expect(TransactionContext.snapshot()).toMatchObject({
        correlationId: 'c',
        requestId: 'r',
        workflowId: 'wf-1',
        userId: 'u1',
      });
    });
  });

  it('restores from snapshot', () => {
    const data = TransactionContext.fromSnapshot(
      { correlationId: 'corr', userId: 'u' },
      { correlationId: 'fallback', requestId: 'fallback' },
    );
    expect(data.correlationId).toBe('corr');
    expect(data.requestId).toBe('fallback');
    expect(data.userId).toBe('u');
  });
});
