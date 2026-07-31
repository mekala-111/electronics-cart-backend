import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionContext } from '../context/transaction-context';
import { WorkflowStore } from './workflow.store';
import {
  RetryPolicy,
  StepRecord,
  WorkflowDefinition,
  WorkflowError,
  WorkflowInstance,
  WorkflowStatus,
} from './workflow.types';

const DEFAULT_WORKFLOW_TIMEOUT_MS = 60_000;
const DEFAULT_RETRY: Required<RetryPolicy> = {
  maxAttempts: 1,
  delayMs: 100,
  backoffFactor: 2,
};

@Injectable()
export class SagaCoordinator {
  private readonly logger = new Logger(SagaCoordinator.name);

  constructor(private readonly store: WorkflowStore) {}

  get<T = Record<string, unknown>>(id: string): WorkflowInstance<T> | undefined {
    return this.store.get<T>(id);
  }

  list(limit = 50): WorkflowInstance[] {
    return this.store.list(limit);
  }

  /**
   * Run a saga: execute steps forward; on failure compensate completed steps in reverse.
   */
  async run<TContext extends Record<string, unknown>>(
    definition: WorkflowDefinition<TContext>,
    initialContext: TContext,
  ): Promise<WorkflowInstance<TContext>> {
    const now = new Date().toISOString();
    const instance: WorkflowInstance<TContext> = {
      id: randomUUID(),
      name: definition.name,
      status: 'running',
      context: { ...initialContext },
      steps: definition.steps.map(
        (s): StepRecord => ({ name: s.name, status: 'pending', attempts: 0 }),
      ),
      currentStepIndex: 0,
      createdAt: now,
      updatedAt: now,
    };
    TransactionContext.patch({ workflowId: instance.id });
    this.store.save(instance);

    const workflowDeadline =
      Date.now() + (definition.timeoutMs ?? DEFAULT_WORKFLOW_TIMEOUT_MS);

    try {
      for (let i = 0; i < definition.steps.length; i++) {
        if (Date.now() > workflowDeadline) {
          await this.failAndCompensate(
            definition,
            instance,
            i,
            'Workflow timed out',
            'timed_out',
          );
          return instance;
        }

        instance.currentStepIndex = i;
        const step = definition.steps[i];
        const record = instance.steps[i];
        const policy = {
          ...DEFAULT_RETRY,
          ...definition.retry,
          ...step.retry,
        };
        const stepTimeout =
          step.timeoutMs ?? Math.max(1_000, workflowDeadline - Date.now());

        record.status = 'running';
        record.startedAt = new Date().toISOString();
        this.touch(instance);

        let lastError: unknown;
        for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
          record.attempts = attempt;
          try {
            const patch = await this.withTimeout(
              Promise.resolve(step.execute(instance.context)),
              stepTimeout,
              `Step "${step.name}" timed out`,
            );
            if (patch && typeof patch === 'object') {
              Object.assign(instance.context, patch);
            }
            record.status = 'completed';
            record.finishedAt = new Date().toISOString();
            this.touch(instance);
            lastError = undefined;
            break;
          } catch (err) {
            lastError = err;
            this.logger.warn(
              `workflow ${instance.id} step ${step.name} attempt ${attempt}/${policy.maxAttempts} failed: ${this.errMsg(err)}`,
            );
            if (attempt < policy.maxAttempts) {
              const delay =
                policy.delayMs * Math.pow(policy.backoffFactor, attempt - 1);
              await this.sleep(delay);
            }
          }
        }

        if (lastError) {
          record.status = 'failed';
          record.error = this.errMsg(lastError);
          record.finishedAt = new Date().toISOString();
          await this.failAndCompensate(
            definition,
            instance,
            i,
            record.error,
            'failed',
            lastError,
          );
          return instance;
        }
      }

      instance.status = 'completed';
      instance.finishedAt = new Date().toISOString();
      this.touch(instance);
      return instance;
    } catch (err) {
      instance.status = 'failed';
      instance.error = this.errMsg(err);
      instance.finishedAt = new Date().toISOString();
      this.touch(instance);
      throw new WorkflowError(instance.error, instance.id, undefined, err);
    }
  }

  private async failAndCompensate<TContext extends Record<string, unknown>>(
    definition: WorkflowDefinition<TContext>,
    instance: WorkflowInstance<TContext>,
    failedIndex: number,
    message: string,
    status: Extract<WorkflowStatus, 'failed' | 'timed_out'>,
    cause?: unknown,
  ): Promise<void> {
    instance.status = 'compensating';
    instance.error = message;
    this.touch(instance);

    for (let i = failedIndex - 1; i >= 0; i--) {
      const step = definition.steps[i];
      const record = instance.steps[i];
      if (record.status !== 'completed' || !step.compensate) {
        continue;
      }
      try {
        await step.compensate(instance.context);
        record.status = 'compensated';
      } catch (compErr) {
        this.logger.error(
          `compensation failed for ${step.name} on ${instance.id}: ${this.errMsg(compErr)}`,
        );
        record.error = `compensate: ${this.errMsg(compErr)}`;
      }
      this.touch(instance);
    }

    instance.status = status;
    instance.finishedAt = new Date().toISOString();
    this.touch(instance);

    if (status === 'failed') {
      this.logger.error(
        `workflow ${instance.id} (${definition.name}) failed at step ${definition.steps[failedIndex]?.name}: ${message}`,
        cause instanceof Error ? cause.stack : undefined,
      );
    }
  }

  private touch(instance: WorkflowInstance): void {
    instance.updatedAt = new Date().toISOString();
    this.store.save(instance);
  }

  private withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    message: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private errMsg(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
