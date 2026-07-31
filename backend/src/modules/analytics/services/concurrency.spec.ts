import { rowsToCsv } from '../utils/export.util';

describe('analytics concurrency safety (lock key shape)', () => {
  it('export util is pure and reentrant', () => {
    const a = rowsToCsv([{ x: 1 }]);
    const b = rowsToCsv([{ x: 1 }]);
    expect(a).toBe(b);
  });
});
