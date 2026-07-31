import { DomainEvent } from '../../../shared/events/domain-event';

export class UserRegisteredEvent extends DomainEvent<{
  userId: string;
  email?: string | null;
  mobile?: string | null;
}> {
  static readonly eventName = 'auth.user.registered';
  /** @deprecated prefer eventName — kept for emit key back-compat */
  static readonly name = UserRegisteredEvent.eventName;
  readonly eventName = UserRegisteredEvent.eventName;
}

export class UserLoggedInEvent extends DomainEvent<{
  userId: string;
  sessionId: string;
  ipAddress?: string;
}> {
  static readonly eventName = 'auth.user.logged_in';
  static readonly name = UserLoggedInEvent.eventName;
  readonly eventName = UserLoggedInEvent.eventName;
}

export class UserLoggedOutEvent extends DomainEvent<{
  userId: string;
  sessionId?: string;
}> {
  static readonly eventName = 'auth.user.logged_out';
  static readonly name = UserLoggedOutEvent.eventName;
  readonly eventName = UserLoggedOutEvent.eventName;
}

export class PasswordChangedEvent extends DomainEvent<{ userId: string }> {
  static readonly eventName = 'auth.password.changed';
  static readonly name = PasswordChangedEvent.eventName;
  readonly eventName = PasswordChangedEvent.eventName;
}

export class EmailVerifiedEvent extends DomainEvent<{
  userId: string;
  email: string;
}> {
  static readonly eventName = 'auth.email.verified';
  static readonly name = EmailVerifiedEvent.eventName;
  readonly eventName = EmailVerifiedEvent.eventName;
}

export class TokenReuseDetectedEvent extends DomainEvent<{
  userId: string;
  familyId: string;
}> {
  static readonly eventName = 'auth.token.reuse_detected';
  static readonly name = TokenReuseDetectedEvent.eventName;
  readonly eventName = TokenReuseDetectedEvent.eventName;
}
