import { Injectable } from '@nestjs/common';
import { EventPublisher } from '../../../shared/events/event-publisher';
import {
  EmailVerifiedEvent,
  PasswordChangedEvent,
  TokenReuseDetectedEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent,
  UserRegisteredEvent,
} from './auth.events';

@Injectable()
export class AuthEventPublisher {
  constructor(private readonly publisher: EventPublisher) {}

  userRegistered(event: UserRegisteredEvent): void {
    this.publisher.publishFireAndForget(event);
  }

  userLoggedIn(event: UserLoggedInEvent): void {
    this.publisher.publishFireAndForget(event);
  }

  userLoggedOut(event: UserLoggedOutEvent): void {
    this.publisher.publishFireAndForget(event);
  }

  passwordChanged(event: PasswordChangedEvent): void {
    this.publisher.publishFireAndForget(event);
  }

  emailVerified(event: EmailVerifiedEvent): void {
    this.publisher.publishFireAndForget(event);
  }

  tokenReuseDetected(event: TokenReuseDetectedEvent): void {
    this.publisher.publishFireAndForget(event);
  }
}
