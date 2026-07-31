import { Injectable, Optional } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import { SendMailOptions } from './mail.service';

export interface EmailJobPayload extends SendMailOptions {
  jobType: 'send-mail';
}

@Injectable()
export class MailQueueHelper {
  constructor(@Optional() private readonly queueService?: QueueService) {}

  async enqueueEmail(
    jobName: string,
    payload: SendMailOptions,
  ): Promise<void> {
    if (!this.queueService) {
      throw new Error('QueueService is not available');
    }

    await this.queueService.enqueue<EmailJobPayload>(
      QUEUE_NAMES.EMAIL,
      jobName,
      { jobType: 'send-mail', ...payload },
    );
  }
}
