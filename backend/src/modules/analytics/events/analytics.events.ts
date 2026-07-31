import { DomainEvent } from '../../../shared/events/domain-event';

export class AnalyticsReportGeneratedEvent extends DomainEvent<{
  reportId: string;
  exportId?: string;
}> {
  static readonly eventName = 'analytics.report.generated';
  readonly eventName = AnalyticsReportGeneratedEvent.eventName;
}

export class AnalyticsDashboardRefreshedEvent extends DomainEvent<{
  layoutCode: string;
}> {
  static readonly eventName = 'analytics.dashboard.refreshed';
  readonly eventName = AnalyticsDashboardRefreshedEvent.eventName;
}

export class AnalyticsKpiUpdatedEvent extends DomainEvent<{
  domain: string;
  period: string;
  snapshotId: string;
}> {
  static readonly eventName = 'analytics.kpi.updated';
  readonly eventName = AnalyticsKpiUpdatedEvent.eventName;
}

export class AnalyticsAlertTriggeredEvent extends DomainEvent<{
  ruleId: string;
  code: string;
  severity: string;
  historyId: string;
}> {
  static readonly eventName = 'analytics.alert.triggered';
  readonly eventName = AnalyticsAlertTriggeredEvent.eventName;
}

export class AnalyticsExportCompletedEvent extends DomainEvent<{
  exportId: string;
  format: string;
  status: string;
}> {
  static readonly eventName = 'analytics.export.completed';
  readonly eventName = AnalyticsExportCompletedEvent.eventName;
}
