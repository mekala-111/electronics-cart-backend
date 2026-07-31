import { PAYMENT_STATUS } from '../constants/payments.constants';
import { mapPayment } from '../mappers/payment.mapper';

describe('payment mapper', () => {
  it('maps decimal fields to numbers', () => {
    const mapped = mapPayment({
      id: 'p1',
      order_id: 'o1',
      customer_id: 'u1',
      gateway_id: 'g1',
      payment_method_id: null,
      saved_payment_method_id: null,
      emi_plan_id: null,
      gateway_order_id: 'order_x',
      gateway_payment_id: null,
      gateway_signature: null,
      gateway_reference: null,
      amount: { toString: () => '99.50' } as never,
      currency: 'INR',
      refunded_amount: { toString: () => '0' } as never,
      status: PAYMENT_STATUS.PENDING,
      authorized_at: null,
      captured_at: null,
      failed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      created_by: null,
      updated_by: null,
      gateway: { code: 'razorpay' },
    } as never);

    expect(mapped.amount).toBe(99.5);
    expect(mapped.gatewayCode).toBe('razorpay');
    expect(mapped.status).toBe('pending');
  });
});
