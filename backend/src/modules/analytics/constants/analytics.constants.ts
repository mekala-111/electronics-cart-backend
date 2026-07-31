export const ANALYTICS_PERMISSIONS = {
  READ: 'analytics.read',
  WRITE: 'analytics.write',
} as const;

export const REPORT_PERMISSIONS = {
  READ: 'report.read',
  WRITE: 'report.write',
} as const;

export const ANALYTICS_CACHE = {
  TTL: 60,
  dashboard: (code: string) => `analytics:dash:${code}`,
  kpis: (period: string) => `analytics:kpi:${period}`,
  funnels: () => 'analytics:funnels',
  trends: (domain: string) => `analytics:trends:${domain}`,
  reports: () => 'analytics:reports:list',
} as const;

export const ANALYTICS_JOBS = {
  KPI_REFRESH: 'analytics.kpi.refresh',
  REPORT_GENERATE: 'analytics.report.generate',
  DASHBOARD_REFRESH: 'analytics.dashboard.refresh',
  TREND_CALC: 'analytics.trend.calc',
  SNAPSHOT: 'analytics.snapshot',
  EXPORT: 'analytics.export',
  ALERT_EVAL: 'analytics.alert.eval',
} as const;

export const DEFAULT_METRIC_STREAM = 'business';
