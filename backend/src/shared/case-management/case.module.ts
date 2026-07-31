import { Global, Module, OnModuleInit } from '@nestjs/common';
import { DomainEventsModule } from '../events/events.module';
import { StateMachineModule } from '../state-machine/state-machine.module';
import { CaseManager } from './case-manager.service';
import { CaseRegistry } from './case.registry';
import { InMemoryCaseStore } from './memory-case.store';

@Global()
@Module({
  imports: [DomainEventsModule, StateMachineModule],
  providers: [CaseRegistry, InMemoryCaseStore, CaseManager],
  exports: [CaseManager, CaseRegistry, InMemoryCaseStore],
})
export class CaseManagementModule implements OnModuleInit {
  constructor(
    private readonly registry: CaseRegistry,
    private readonly memory: InMemoryCaseStore,
  ) {}

  onModuleInit() {
    // Ensure defaults even if CaseManager ctor order differs in tests
    if (!this.registry.hasStore('support')) {
      this.registry.registerStore('support', this.memory);
    }
    if (!this.registry.hasStore('repair_job')) {
      this.registry.registerStore('repair_job', this.memory);
    }
  }
}
