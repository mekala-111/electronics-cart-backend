import { DomainEvent } from '../../../shared/events/domain-event';

export class WarrantyRegisteredEvent extends DomainEvent<{
  registrationId: string;
  serialNumberId?: string;
  planId: string;
  customerId?: string;
}> {
  static readonly eventName = 'warranty.registered';
  readonly eventName = WarrantyRegisteredEvent.eventName;
}

export class WarrantyClaimCreatedEvent extends DomainEvent<{
  claimId: string;
  registrationId: string;
  customerId?: string;
}> {
  static readonly eventName = 'warranty.claim.created';
  readonly eventName = WarrantyClaimCreatedEvent.eventName;
}

export class WarrantyClaimApprovedEvent extends DomainEvent<{
  claimId: string;
}> {
  static readonly eventName = 'warranty.claim.approved';
  readonly eventName = WarrantyClaimApprovedEvent.eventName;
}

export class WarrantyClaimRejectedEvent extends DomainEvent<{
  claimId: string;
  reason?: string;
}> {
  static readonly eventName = 'warranty.claim.rejected';
  readonly eventName = WarrantyClaimRejectedEvent.eventName;
}

export class RmaCreatedEvent extends DomainEvent<{
  rmaId: string;
  orderId?: string;
  customerId?: string;
}> {
  static readonly eventName = 'rma.created';
  readonly eventName = RmaCreatedEvent.eventName;
}

export class RmaApprovedEvent extends DomainEvent<{ rmaId: string }> {
  static readonly eventName = 'rma.approved';
  readonly eventName = RmaApprovedEvent.eventName;
}

export class RepairStartedEvent extends DomainEvent<{
  repairJobId: string;
  ticketId: string;
}> {
  static readonly eventName = 'repair.started';
  readonly eventName = RepairStartedEvent.eventName;
}

export class RepairCompletedEvent extends DomainEvent<{
  repairJobId: string;
  ticketId: string;
  outcome: string;
}> {
  static readonly eventName = 'repair.completed';
  readonly eventName = RepairCompletedEvent.eventName;
}

export class DeviceReplacedEvent extends DomainEvent<{
  replacementRequestId: string;
  ticketId?: string;
}> {
  static readonly eventName = 'device.replaced';
  readonly eventName = DeviceReplacedEvent.eventName;
}

export class LoanDeviceAllocatedEvent extends DomainEvent<{
  allocationId: string;
  loanDeviceId: string;
  ticketId?: string;
}> {
  static readonly eventName = 'loan_device.allocated';
  readonly eventName = LoanDeviceAllocatedEvent.eventName;
}

export class ServiceTicketCreatedEvent extends DomainEvent<{
  ticketId: string;
  customerId?: string;
}> {
  static readonly eventName = 'service.ticket.created';
  readonly eventName = ServiceTicketCreatedEvent.eventName;
}

export class ServiceTicketClosedEvent extends DomainEvent<{
  ticketId: string;
}> {
  static readonly eventName = 'service.ticket.closed';
  readonly eventName = ServiceTicketClosedEvent.eventName;
}
