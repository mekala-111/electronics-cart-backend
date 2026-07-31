export interface DomainEvent<TPayload = Record<string, unknown>> {
  name: string;
  payload: TPayload;
  occurredAt: Date;
}
