import { Global, Module } from '@nestjs/common';
import { SagaCoordinator } from './saga-coordinator.service';
import { WorkflowStore } from './workflow.store';

@Global()
@Module({
  providers: [WorkflowStore, SagaCoordinator],
  exports: [WorkflowStore, SagaCoordinator],
})
export class WorkflowModule {}
