import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsOptions, Queue } from 'bullmq';
import { TransactionContext } from '../context/transaction-context';
import { QUEUE_NAMES } from './queue.constants';
import { createQueue } from './queue.factory';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly queues = new Map<string, Queue>();
  private readonly redisUrl: string;

  constructor(private readonly config: ConfigService) {
    this.redisUrl = this.config.getOrThrow<string>('queue.redisUrl');
  }

  getQueue(name: string): Queue {
    let queue = this.queues.get(name);
    if (!queue) {
      queue = createQueue(name, this.redisUrl);
      this.queues.set(name, queue);
    }
    return queue;
  }

  async enqueue<T>(
    queueName: string,
    jobName: string,
    data: T,
    opts?: JobsOptions,
  ) {
    const queue = this.getQueue(queueName);
    const payload =
      data !== null && typeof data === 'object'
        ? { ...(data as object), __tx: TransactionContext.snapshot() }
        : data;
    return queue.add(jobName, payload, opts);
  }

  async enqueueDefault<T>(
    jobName: string,
    data: T,
    opts?: JobsOptions,
  ) {
    return this.enqueue(QUEUE_NAMES.DEFAULT, jobName, data, opts);
  }

  async enqueueEmail<T>(jobName: string, data: T, opts?: JobsOptions) {
    return this.enqueue(QUEUE_NAMES.EMAIL, jobName, data, opts);
  }

  async enqueueDlq<T>(jobName: string, data: T, opts?: JobsOptions) {
    return this.enqueue(QUEUE_NAMES.DLQ, jobName, data, opts);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      [...this.queues.values()].map((queue) => queue.close()),
    );
  }
}
