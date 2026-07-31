import { Global, Module } from '@nestjs/common';
import { DomainEventsModule } from '../events/events.module';
import { MetricsService } from './MetricsService';
import { BufferedExporter } from './exporters/buffered.exporter';
import { DefaultEventPublisherExporter } from './exporters/event-publisher.exporter';
import { METRICS_EXPORTER } from './types/metric.types';

@Global()
@Module({
  imports: [DomainEventsModule],
  providers: [
    DefaultEventPublisherExporter,
    {
      provide: BufferedExporter,
      useFactory: (sink: DefaultEventPublisherExporter) =>
        new BufferedExporter({ maxSize: 10_000, sink }),
      inject: [DefaultEventPublisherExporter],
    },
    {
      provide: METRICS_EXPORTER,
      useExisting: DefaultEventPublisherExporter,
    },
    MetricsService,
  ],
  exports: [MetricsService, METRICS_EXPORTER, BufferedExporter],
})
export class MetricsModule {}
