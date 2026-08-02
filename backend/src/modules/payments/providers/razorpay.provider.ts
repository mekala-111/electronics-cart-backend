import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithTimeout } from '../../../shared/http/fetch-with-timeout';
import type {
  AuthorizePaymentInput,
  AuthorizePaymentResult,
  CancelPaymentInput,
  CancelPaymentResult,
  CapturePaymentInput,
  CapturePaymentResult,
  CreateGatewayOrderInput,
  CreateGatewayOrderResult,
  PaymentProvider,
  RefundGatewayInput,
  RefundGatewayResult,
  VerifyWebhookInput,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class RazorpayProvider implements PaymentProvider {
  readonly code = 'razorpay' as const;
  private readonly logger = new Logger(RazorpayProvider.name);
  private readonly mock: boolean;
  /** Settle authorize/capture without client Razorpay payment (storefront has no SDK). */
  private readonly serverCapture: boolean;
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.mock = this.config.get<boolean>('payment.mock') ?? true;
    this.serverCapture = this.config.get<boolean>('payment.serverCapture') ?? true;
    this.keyId = this.config.get<string>('payment.razorpay.keyId') ?? '';
    this.keySecret = this.config.get<string>('payment.razorpay.keySecret') ?? '';
    this.baseUrl =
      this.config.get<string>('payment.razorpay.baseUrl') ??
      'https://api.razorpay.com/v1';
  }

  /** Mock settlement: PAYMENTS_MOCK or server-side capture (no Checkout.js). */
  private get settleLocally(): boolean {
    return this.mock || this.serverCapture;
  }

  async createOrder(
    input: CreateGatewayOrderInput,
  ): Promise<CreateGatewayOrderResult> {
    if (this.settleLocally) {
      return this.mockOrder(input);
    }

    try {
      const body = {
        amount: toPaise(input.amount),
        currency: input.currency,
        receipt: input.receipt.slice(0, 40),
        notes: input.notes ?? {},
      };
      const raw = await this.request<Record<string, unknown>>('POST', '/orders', body);
      return { gatewayOrderId: String(raw.id), raw };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Invalid/placeholder keys → local order so checkout is not hard-blocked.
      if (/authentication failed/i.test(msg)) {
        this.logger.error(
          `Razorpay createOrder auth failed (${msg}); falling back to server-capture mock order. Fix RAZORPAY_KEY_ID/SECRET.`,
        );
        return this.mockOrder(input);
      }
      throw err;
    }
  }

  private mockOrder(input: CreateGatewayOrderInput): CreateGatewayOrderResult {
    const gatewayOrderId = `order_mock_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    return {
      gatewayOrderId,
      raw: {
        id: gatewayOrderId,
        amount: toPaise(input.amount),
        currency: input.currency,
        status: 'created',
        mock: true,
        serverCapture: this.serverCapture,
      },
    };
  }

  async authorize(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentResult> {
    if (this.settleLocally) {
      const gatewayPaymentId = `pay_mock_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
      return {
        gatewayPaymentId,
        gatewaySignature: `sig_mock_${randomUUID().slice(0, 8)}`,
        status: 'authorized',
        raw: {
          id: gatewayPaymentId,
          order_id: input.gatewayOrderId,
          status: 'authorized',
          amount: toPaise(input.amount),
          mock: true,
        },
      };
    }

    // Live authorize is typically client-driven; fetch order payments as status probe.
    const raw = await this.request<Record<string, unknown>>(
      'GET',
      `/orders/${encodeURIComponent(input.gatewayOrderId)}/payments`,
    );
    const items = (raw.items as Record<string, unknown>[] | undefined) ?? [];
    const paid = items.find((p) =>
      ['authorized', 'captured'].includes(String(p.status)),
    );
    if (!paid) {
      return {
        gatewayPaymentId: '',
        status: 'pending',
        raw,
      };
    }
    return {
      gatewayPaymentId: String(paid.id),
      status: String(paid.status) === 'captured' ? 'authorized' : 'authorized',
      raw: paid,
    };
  }

  async capture(input: CapturePaymentInput): Promise<CapturePaymentResult> {
    if (this.settleLocally) {
      return {
        gatewayPaymentId: input.gatewayPaymentId,
        status: 'captured',
        raw: {
          id: input.gatewayPaymentId,
          status: 'captured',
          amount: toPaise(input.amount),
          mock: true,
          serverCapture: this.serverCapture,
        },
      };
    }

    const raw = await this.request<Record<string, unknown>>(
      'POST',
      `/payments/${encodeURIComponent(input.gatewayPaymentId)}/capture`,
      { amount: toPaise(input.amount), currency: input.currency },
    );
    return {
      gatewayPaymentId: String(raw.id),
      status: String(raw.status) === 'captured' ? 'captured' : 'failed',
      raw,
    };
  }

  async cancel(input: CancelPaymentInput): Promise<CancelPaymentResult> {
    if (this.settleLocally) {
      return {
        status: 'cancelled',
        raw: { mock: true, gatewayPaymentId: input.gatewayPaymentId },
      };
    }

    if (input.gatewayPaymentId) {
      try {
        const raw = await this.request<Record<string, unknown>>(
          'POST',
          `/payments/${encodeURIComponent(input.gatewayPaymentId)}/cancel`,
        );
        return { status: 'cancelled', raw };
      } catch (err) {
        this.logger.warn(`cancel payment failed: ${String(err)}`);
      }
    }

    return { status: 'voided', raw: { note: 'order left uncaptured' } };
  }

  async refund(input: RefundGatewayInput): Promise<RefundGatewayResult> {
    if (this.settleLocally) {
      const gatewayRefundId = `rfnd_mock_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
      return {
        gatewayRefundId,
        status: 'processed',
        raw: {
          id: gatewayRefundId,
          payment_id: input.gatewayPaymentId,
          amount: toPaise(input.amount),
          status: 'processed',
          mock: true,
        },
      };
    }

    const raw = await this.request<Record<string, unknown>>(
      'POST',
      `/payments/${encodeURIComponent(input.gatewayPaymentId)}/refund`,
      {
        amount: toPaise(input.amount),
        notes: input.notes ?? {},
      },
    );
    const status = String(raw.status);
    return {
      gatewayRefundId: String(raw.id),
      status:
        status === 'processed' || status === 'completed'
          ? 'processed'
          : status === 'failed'
            ? 'failed'
            : 'pending',
      raw,
    };
  }

  verifyWebhookSignature(input: VerifyWebhookInput): boolean {
    const secret =
      input.secret ||
      this.config.get<string>('payment.razorpay.webhookSecret') ||
      '';
    if (this.settleLocally && !secret) {
      return true;
    }
    if (!secret || !input.signature) return false;

    const body =
      typeof input.rawBody === 'string'
        ? input.rawBody
        : input.rawBody.toString('utf8');
    const expected = createHmac('sha256', secret).update(body).digest('hex');
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(input.signature);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString(
      'base64',
    );
    const timeoutMs =
      this.config.get<number>('payment.authorizeTimeoutMs') ?? 30_000;
    const res = await fetchWithTimeout(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      timeoutMs,
      retries: 2,
    });

    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      json = { raw: text };
    }

    if (!res.ok) {
      const msg =
        (json.error as { description?: string } | undefined)?.description ??
        `Razorpay ${res.status}`;
      const err = new Error(msg) as Error & { status?: number; retryable?: boolean };
      err.status = res.status;
      err.retryable = res.status >= 500 || res.status === 429;
      throw err;
    }

    return json as T;
  }
}

function toPaise(amount: number): number {
  return Math.round(Number(amount) * 100);
}
