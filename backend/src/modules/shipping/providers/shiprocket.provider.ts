import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithTimeout } from '../../../shared/http/fetch-with-timeout';
import type {
  CreateCarrierShipmentInput,
  CreateCarrierShipmentResult,
  GenerateLabelInput,
  GenerateLabelResult,
  SchedulePickupInput,
  SchedulePickupResult,
  ShippingProvider,
  TrackingSyncInput,
  TrackingSyncResult,
  VerifyShippingWebhookInput,
} from '../interfaces/shipping-provider.interface';

@Injectable()
export class ShiprocketProvider implements ShippingProvider {
  readonly code = 'shiprocket' as const;
  private readonly logger = new Logger(ShiprocketProvider.name);
  private readonly mock: boolean;
  private readonly email: string;
  private readonly password: string;
  private readonly baseUrl: string;
  private token?: string;

  constructor(private readonly config: ConfigService) {
    this.mock = this.config.get<boolean>('shipping.mock') ?? true;
    this.email = this.config.get<string>('shipping.shiprocket.email') ?? '';
    this.password =
      this.config.get<string>('shipping.shiprocket.password') ?? '';
    this.baseUrl =
      this.config.get<string>('shipping.shiprocket.baseUrl') ??
      'https://apiv2.shiprocket.in/v1/external';
  }

  async createShipment(
    input: CreateCarrierShipmentInput,
  ): Promise<CreateCarrierShipmentResult> {
    if (this.mock) {
      const ref = `SR_mock_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
      const awb = `AWB${Date.now().toString().slice(-10)}`;
      return {
        partnerShipmentRef: ref,
        awbNumber: awb,
        trackingNumber: awb,
        raw: { mock: true, order_id: ref, awb },
      };
    }

    await this.ensureToken();
    const raw = await this.request<Record<string, unknown>>(
      'POST',
      '/orders/create/adhoc',
      {
        order_id: input.shipmentNumber,
        order_date: new Date().toISOString().slice(0, 10),
        pickup_location: input.pickupPincode,
        billing_customer_name: input.customerName,
        billing_phone: input.customerPhone ?? '9999999999',
        billing_address: input.customerAddress,
        billing_city: input.customerCity,
        billing_state: input.customerState,
        billing_pincode: input.deliveryPincode,
        billing_country: 'India',
        shipping_is_billing: true,
        weight: input.weightKg,
        length: input.lengthCm ?? 10,
        breadth: input.widthCm ?? 10,
        height: input.heightCm ?? 10,
        sub_total: input.declaredValue ?? 0,
        payment_method: input.codAmount && input.codAmount > 0 ? 'COD' : 'Prepaid',
      },
    );
    return {
      partnerShipmentRef: String(raw.order_id ?? raw.shipment_id ?? ''),
      awbNumber: raw.awb_code ? String(raw.awb_code) : undefined,
      trackingNumber: raw.awb_code ? String(raw.awb_code) : undefined,
      raw,
    };
  }

  async generateLabel(input: GenerateLabelInput): Promise<GenerateLabelResult> {
    if (this.mock) {
      return {
        labelUrl: `https://mock.shiprocket.local/labels/${input.partnerShipmentRef}.pdf`,
        format: 'pdf',
        raw: { mock: true },
      };
    }
    await this.ensureToken();
    const raw = await this.request<Record<string, unknown>>(
      'POST',
      '/courier/generate/label',
      { shipment_id: [input.partnerShipmentRef] },
    );
    const labelUrl = String(
      (raw.label_url as string) ??
        (raw.label_url as string[] | undefined)?.[0] ??
        '',
    );
    return { labelUrl, format: 'pdf', raw };
  }

  async schedulePickup(
    input: SchedulePickupInput,
  ): Promise<SchedulePickupResult> {
    if (this.mock) {
      const ref = `PKP_mock_${randomUUID().slice(0, 8)}`;
      return {
        partnerPickupRef: ref,
        scheduledAt: input.scheduledAt ?? new Date(),
        raw: { mock: true, pickup_id: ref },
      };
    }
    await this.ensureToken();
    const raw = await this.request<Record<string, unknown>>(
      'POST',
      '/courier/generate/pickup',
      {
        shipment_id: [input.partnerShipmentRef],
        pickup_date: (input.scheduledAt ?? new Date())
          .toISOString()
          .slice(0, 10),
      },
    );
    return {
      partnerPickupRef: String(raw.pickup_status ?? raw.pickup_id ?? ''),
      scheduledAt: input.scheduledAt,
      raw,
    };
  }

  async syncTracking(input: TrackingSyncInput): Promise<TrackingSyncResult> {
    if (this.mock) {
      const awb = input.awbNumber ?? input.trackingNumber ?? 'AWBMOCK';
      return {
        status: 'in_transit',
        location: 'Hub',
        events: [
          {
            status: 'in_transit',
            code: 'IT',
            description: 'In transit (mock)',
            location: 'Hub',
            occurredAt: new Date(),
          },
        ],
        eta: new Date(Date.now() + 2 * 86400000),
        raw: { mock: true, awb },
      };
    }
    await this.ensureToken();
    const awb = input.awbNumber ?? input.trackingNumber ?? '';
    const raw = await this.request<Record<string, unknown>>(
      'GET',
      `/courier/track/awb/${encodeURIComponent(awb)}`,
    );
    const tracking = (raw.tracking_data as Record<string, unknown>) ?? raw;
    const activities =
      (tracking.shipment_track_activities as Record<string, unknown>[]) ?? [];
    return {
      status: String(tracking.shipment_status ?? 'in_transit'),
      location: activities[0] ? String(activities[0].location ?? '') : undefined,
      events: activities.map((a) => ({
        status: String(a.activity ?? a.status ?? 'update'),
        code: a['sr-status'] ? String(a['sr-status']) : undefined,
        description: String(a.activity ?? ''),
        location: a.location ? String(a.location) : undefined,
        occurredAt: a.date ? new Date(String(a.date)) : new Date(),
      })),
      raw,
    };
  }

  verifyWebhookSignature(input: VerifyShippingWebhookInput): boolean {
    const secret =
      input.secret ||
      this.config.get<string>('shipping.shiprocket.webhookSecret') ||
      '';
    if (this.mock && !secret) return true;
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

  private async ensureToken(): Promise<void> {
    if (this.token) return;
    const res = await fetchWithTimeout(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.email, password: this.password }),
      timeoutMs: 30_000,
      retries: 2,
    });
    const json = (await res.json()) as { token?: string };
    if (!res.ok || !json.token) {
      throw Object.assign(new Error('Shiprocket auth failed'), {
        status: res.status,
        retryable: res.status >= 500,
      });
    }
    this.token = json.token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetchWithTimeout(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      timeoutMs: 30_000,
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
      const err = new Error(`Shiprocket ${res.status}`) as Error & {
        status?: number;
        retryable?: boolean;
      };
      err.status = res.status;
      err.retryable = res.status >= 500 || res.status === 429;
      this.logger.warn(`carrier api error status=${res.status}`);
      throw err;
    }
    return json as T;
  }
}
