import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DeadLetterHandler } from './dead-letter.handler';
import { EventBus } from './event-bus';
import { EventPublisher } from './event-publisher';
import { OutboxPublisher } from './outbox.publisher';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 32,
      ignoreErrors: false,
    }),
  ],
  providers: [
    DeadLetterHandler,
    OutboxPublisher,
    EventBus,
    EventPublisher,
  ],
  exports: [
    EventEmitterModule,
    DeadLetterHandler,
    OutboxPublisher,
    EventBus,
    EventPublisher,
  ],
})
export class DomainEventsModule {}
