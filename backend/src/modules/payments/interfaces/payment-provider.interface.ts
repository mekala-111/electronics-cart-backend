export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export type GatewayCode =
  | 'razorpay'
  | 'stripe'
  | 'paypal'
  | 'phonepe'
  | 'cashfree'
  | 'internal';

export interface CreateGatewayOrderInput {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreateGatewayOrderResult {
  gatewayOrderId: string;
  raw: Record<string, unknown>;
}

export interface AuthorizePaymentInput {
  gatewayOrderId: string;
  amount: number;
  currency: string;
  paymentMethodHint?: string;
}

export interface AuthorizePaymentResult {
  gatewayPaymentId: string;
  gatewaySignature?: string;
  status: 'authorized' | 'pending' | 'failed';
  raw: Record<string, unknown>;
}

export interface CapturePaymentInput {
  gatewayPaymentId: string;
  amount: number;
  currency: string;
}

export interface CapturePaymentResult {
  gatewayPaymentId: string;
  status: 'captured' | 'failed';
  raw: Record<string, unknown>;
}

export interface CancelPaymentInput {
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  amount: number;
  currency: string;
}

export interface CancelPaymentResult {
  status: 'cancelled' | 'voided' | 'failed';
  raw: Record<string, unknown>;
}

export interface RefundGatewayInput {
  gatewayPaymentId: string;
  amount: number;
  currency: string;
  notes?: Record<string, string>;
}

export interface RefundGatewayResult {
  gatewayRefundId: string;
  status: 'processed' | 'pending' | 'failed';
  raw: Record<string, unknown>;
}

export interface VerifyWebhookInput {
  rawBody: string | Buffer;
  signature: string;
  secret: string;
}

/**
 * Gateway abstraction — controllers/services never call Razorpay directly.
 */
export interface PaymentProvider {
  readonly code: GatewayCode;
  createOrder(input: CreateGatewayOrderInput): Promise<CreateGatewayOrderResult>;
  authorize(input: AuthorizePaymentInput): Promise<AuthorizePaymentResult>;
  capture(input: CapturePaymentInput): Promise<CapturePaymentResult>;
  cancel(input: CancelPaymentInput): Promise<CancelPaymentResult>;
  refund(input: RefundGatewayInput): Promise<RefundGatewayResult>;
  verifyWebhookSignature(input: VerifyWebhookInput): boolean;
}
