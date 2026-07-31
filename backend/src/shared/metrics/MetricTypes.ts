/** Canonical metric kind constants (domain-agnostic). */
export const MetricTypes = {
  COUNTER: 'counter',
  GAUGE: 'gauge',
  TIMING: 'timing',
  HISTOGRAM: 'histogram',
  KPI: 'kpi',
  TELEMETRY: 'telemetry',
} as const;
