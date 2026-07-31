export const SHIPPING_PROVIDER = Symbol('SHIPPING_PROVIDER');

export type ShippingPartnerCode =
  | 'shiprocket'
  | 'delhivery'
  | 'bluedart'
  | 'dtdc'
  | 'xpressbees'
  | 'india_post'
  | 'dhl'
  | 'fedex'
  | 'ups'
  | 'other';

export interface CreateCarrierShipmentInput {
  orderId: string;
  shipmentNumber: string;
  weightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  declaredValue?: number;
  codAmount?: number;
  pickupPincode: string;
  deliveryPincode: string;
  customerName: string;
  customerPhone?: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
}

export interface CreateCarrierShipmentResult {
  partnerShipmentRef: string;
  awbNumber?: string;
  trackingNumber?: string;
  raw: Record<string, unknown>;
}

export interface GenerateLabelInput {
  partnerShipmentRef: string;
  awbNumber?: string;
}

export interface GenerateLabelResult {
  labelUrl: string;
  format: 'pdf' | 'zpl' | 'png';
  raw: Record<string, unknown>;
}

export interface SchedulePickupInput {
  partnerShipmentRef: string;
  warehouseId: string;
  scheduledAt?: Date;
  packageCount: number;
}

export interface SchedulePickupResult {
  partnerPickupRef: string;
  scheduledAt?: Date;
  raw: Record<string, unknown>;
}

export interface TrackingSyncInput {
  trackingNumber?: string;
  awbNumber?: string;
  partnerShipmentRef?: string;
}

export interface TrackingSyncResult {
  status: string;
  location?: string;
  events: Array<{
    status: string;
    code?: string;
    description?: string;
    location?: string;
    occurredAt: Date;
  }>;
  eta?: Date;
  raw: Record<string, unknown>;
}

export interface VerifyShippingWebhookInput {
  rawBody: string | Buffer;
  signature: string;
  secret: string;
}

export interface ShippingProvider {
  readonly code: ShippingPartnerCode;
  createShipment(
    input: CreateCarrierShipmentInput,
  ): Promise<CreateCarrierShipmentResult>;
  generateLabel(input: GenerateLabelInput): Promise<GenerateLabelResult>;
  schedulePickup(input: SchedulePickupInput): Promise<SchedulePickupResult>;
  syncTracking(input: TrackingSyncInput): Promise<TrackingSyncResult>;
  verifyWebhookSignature(input: VerifyShippingWebhookInput): boolean;
}
