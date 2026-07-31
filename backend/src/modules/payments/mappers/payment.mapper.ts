import { Payment, PaymentMethod, Refund, SavedPaymentMethod } from '@prisma/client';

export function mapPayment(p: Payment & { gateway?: { code: string } | null }) {
  return {
    id: p.id,
    orderId: p.order_id,
    customerId: p.customer_id,
    gatewayId: p.gateway_id,
    gatewayCode: p.gateway?.code,
    paymentMethodId: p.payment_method_id,
    amount: Number(p.amount),
    currency: p.currency,
    refundedAmount: Number(p.refunded_amount),
    status: p.status,
    gatewayOrderId: p.gateway_order_id,
    gatewayPaymentId: p.gateway_payment_id,
    authorizedAt: p.authorized_at,
    capturedAt: p.captured_at,
    failedAt: p.failed_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export function mapRefund(r: Refund) {
  return {
    id: r.id,
    refundNumber: r.refund_number,
    paymentId: r.payment_id,
    orderId: r.order_id,
    refundType: r.refund_type,
    amount: Number(r.amount),
    currency: r.currency,
    status: r.status,
    reason: r.reason,
    gatewayRefundId: r.gateway_refund_id,
    processedAt: r.processed_at,
    createdAt: r.created_at,
  };
}

export function mapMethod(m: PaymentMethod) {
  return {
    id: m.id,
    gatewayId: m.gateway_id,
    code: m.code,
    name: m.name,
    status: m.status,
  };
}

export function mapSavedMethod(m: SavedPaymentMethod) {
  return {
    id: m.id,
    gatewayId: m.gateway_id,
    brand: m.brand,
    lastFour: m.last_four,
    expiryMonth: m.expiry_month,
    expiryYear: m.expiry_year,
    isDefault: m.is_default,
    status: m.status,
    createdAt: m.created_at,
  };
}
