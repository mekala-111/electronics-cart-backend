import { Injectable } from '@nestjs/common';
import { WorkflowInstance } from './workflow.types';

/**
 * In-memory workflow state.
 * # ponytail: process-local Map; persistent store when DB v2 allows workflow_runs
 */
@Injectable()
export class WorkflowStore {
  private readonly instances = new Map<string, WorkflowInstance>();

  save<T>(instance: WorkflowInstance<T>): void {
    this.instances.set(instance.id, instance as WorkflowInstance);
  }

  get<T = Record<string, unknown>>(id: string): WorkflowInstance<T> | undefined {
    return this.instances.get(id) as WorkflowInstance<T> | undefined;
  }

  list(limit = 50): WorkflowInstance[] {
    return [...this.instances.values()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }

  delete(id: string): boolean {
    return this.instances.delete(id);
  }

  clear(): void {
    this.instances.clear();
  }

  size(): number {
    return this.instances.size;
  }
}
