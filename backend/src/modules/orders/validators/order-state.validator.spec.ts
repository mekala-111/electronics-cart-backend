import { canCancel, canRequestReturn } from './order-state.validator';

describe('order state transitions', () => {
  it('allows cancel from pending/confirmed only', () => {
    expect(canCancel('pending')).toBe(true);
    expect(canCancel('confirmed')).toBe(true);
    expect(canCancel('shipped')).toBe(false);
  });

  it('allows return from delivered-like states', () => {
    expect(canRequestReturn('delivered')).toBe(true);
    expect(canRequestReturn('pending')).toBe(false);
  });
});
