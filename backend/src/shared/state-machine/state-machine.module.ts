import { Global, Module } from '@nestjs/common';
import { DomainEventsModule } from '../events/events.module';
import { StateMachineEngine } from './state-machine.engine';

@Global()
@Module({
  imports: [DomainEventsModule],
  providers: [StateMachineEngine],
  exports: [StateMachineEngine],
})
export class StateMachineModule {}
