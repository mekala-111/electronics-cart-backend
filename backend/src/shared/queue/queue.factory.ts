import {
  Processor,
  Queue,
  QueueOptions,
  Worker,
  WorkerOptions,
} from 'bullmq';
import IORedis from 'ioredis';

export function createQueueConnection(redisUrl: string): IORedis {
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });
}

export function createQueue(
  name: string,
  redisUrl: string,
  options?: Omit<QueueOptions, 'connection'>,
): Queue {
  return new Queue(name, {
    connection: createQueueConnection(redisUrl),
    ...options,
  });
}

export function createWorker(
  name: string,
  redisUrl: string,
  processor: Processor,
  options?: Omit<WorkerOptions, 'connection'>,
): Worker {
  const concurrency = Number(process.env.QUEUE_CONCURRENCY ?? 5);
  return new Worker(name, processor, {
    connection: createQueueConnection(redisUrl),
    concurrency: Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 5,
    ...options,
  });
}
