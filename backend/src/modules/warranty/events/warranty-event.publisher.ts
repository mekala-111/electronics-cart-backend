import { Injectable } from '@nestjs/common';
import { EventPublisher } from '../../../shared/events/event-publisher';
import * as E from './warranty.events';

@Injectable()
export class WarrantyEventPublisher {
  constructor(private readonly publisher: EventPublisher) {}

  registered(e: E.WarrantyRegisteredEvent) {
    void this.publisher.publish(e);
  }
  claimCreated(e: E.WarrantyClaimCreatedEvent) {
    void this.publisher.publish(e);
  }
  claimApproved(e: E.WarrantyClaimApprovedEvent) {
    void this.publisher.publish(e);
  }
  claimRejected(e: E.WarrantyClaimRejectedEvent) {
    void this.publisher.publish(e);
  }
  rmaCreated(e: E.RmaCreatedEvent) {
    void this.publisher.publish(e);
  }
  rmaApproved(e: E.RmaApprovedEvent) {
    void this.publisher.publish(e);
  }
  repairStarted(e: E.RepairStartedEvent) {
    void this.publisher.publish(e);
  }
  repairCompleted(e: E.RepairCompletedEvent) {
    void this.publisher.publish(e);
  }
  deviceReplaced(e: E.DeviceReplacedEvent) {
    void this.publisher.publish(e);
  }
  loanAllocated(e: E.LoanDeviceAllocatedEvent) {
    void this.publisher.publish(e);
  }
  ticketCreated(e: E.ServiceTicketCreatedEvent) {
    void this.publisher.publish(e);
  }
  ticketClosed(e: E.ServiceTicketClosedEvent) {
    void this.publisher.publish(e);
  }
}
