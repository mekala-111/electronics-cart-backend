import { assertTransition } from './payment-state.validator';
import { AppException } from '../../../core/errors/app.exception';

describe('payment state machine', () => {
  it('allows pending → authorized', () => {
    expect(() => assertTransition('pending', 'authorized')).not.toThrow();
  });

  it('allows authorized → captured', () => {
    expect(() => assertTransition('authorized', 'captured')).not.toThrow();
  });

  it('rejects captured → authorized', () => {
    expect(() => assertTransition('captured', 'authorized')).toThrow(AppException);
  });

  it('allows captured → partially_refunded', () => {
    expect(() =>
      assertTransition('captured', 'partially_refunded'),
    ).not.toThrow();
  });
});
