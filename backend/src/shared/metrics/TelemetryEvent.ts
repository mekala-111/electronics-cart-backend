import type {
  MetricContextFields,
  TelemetryEvent,
  TelemetryEventInput,
} from './types/metric.types';
import { sanitizeMetadata } from './utils/sanitize.util';

export type { TelemetryEvent, TelemetryEventInput };

export function createTelemetryEvent(
  input: TelemetryEventInput,
  context: MetricContextFields,
): TelemetryEvent {
  return {
    name: input.name,
    category: input.category,
    action: input.action,
    subject: input.subject,
    outcome: input.outcome,
    timestamp: input.timestamp ?? new Date(),
    metadata: sanitizeMetadata(input.metadata),
    tags: input.tags,
    funnel: input.funnel,
    step: input.step,
    sequence: input.sequence,
    conversion: input.conversion,
    abVariant: input.abVariant,
    campaignId: input.campaignId,
    context,
  };
}
