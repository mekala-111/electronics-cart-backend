import { Injectable } from '@nestjs/common';
import { EventPublisher } from '../../../shared/events/event-publisher';
import * as E from './analytics.events';

@Injectable()
export class AnalyticsEventPublisher {
  constructor(private readonly publisher: EventPublisher) {}

  reportGenerated(e: E.AnalyticsReportGeneratedEvent) {
    void this.publisher.publish(e);
  }
  dashboardRefreshed(e: E.AnalyticsDashboardRefreshedEvent) {
    void this.publisher.publish(e);
  }
  kpiUpdated(e: E.AnalyticsKpiUpdatedEvent) {
    void this.publisher.publish(e);
  }
  alertTriggered(e: E.AnalyticsAlertTriggeredEvent) {
    void this.publisher.publish(e);
  }
  exportCompleted(e: E.AnalyticsExportCompletedEvent) {
    void this.publisher.publish(e);
  }
}
