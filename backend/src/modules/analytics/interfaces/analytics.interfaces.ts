export const FUNNEL_STEPS = [
  'landing',
  'product_view',
  'search',
  'add_to_cart',
  'checkout',
  'payment',
  'order_complete',
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const DASHBOARD_CODES = [
  'executive',
  'sales',
  'revenue',
  'orders',
  'payments',
  'inventory',
  'shipping',
  'warranty',
  'service',
  'marketing',
  'search',
  'recommendation',
  'system',
] as const;

export type DashboardCode = (typeof DASHBOARD_CODES)[number];

export interface DashboardPayload {
  code: string;
  name: string;
  refreshedAt: string;
  widgets: Array<{
    code: string;
    title: string;
    type: string;
    data: unknown;
  }>;
}

export interface FunnelStepStats {
  step: string;
  count: number;
  dropOffPct: number | null;
  conversionFromPrevPct: number | null;
}

export interface RfmSegment {
  customerId: string;
  recencyDays: number;
  frequency: number;
  monetary: number;
  r: number;
  f: number;
  m: number;
  segment: string;
}
