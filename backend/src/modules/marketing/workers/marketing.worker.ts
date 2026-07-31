import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import { QueueService } from '../../../shared/queue/queue.service';
import { BaseWorker } from '../../../shared/queue/worker.base';
import { MARKETING_JOBS } from '../constants/marketing.constants';
import { MarketingRepository } from '../repositories/marketing.repository';
import { CampaignService } from '../services/growth.services';

type MktJob = { campaignId?: string; channel?: string; query?: string; rewardId?: string };

@Injectable()
export class MarketingWorker
  extends BaseWorker<MktJob>
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    queueService: QueueService,
    config: ConfigService,
    private readonly campaigns: CampaignService,
    private readonly repo: MarketingRepository,
  ) {
    super(
      QUEUE_NAMES.MARKETING,
      queueService,
      config.getOrThrow<string>('queue.redisUrl'),
    );
  }

  onModuleInit() {
    this.start();
  }

  async onModuleDestroy() {
    await this.stop();
  }

  protected async process(job: Job<MktJob>): Promise<void> {
    switch (job.name) {
      case MARKETING_JOBS.EMAIL_DELIVERY:
      case MARKETING_JOBS.SMS_DELIVERY:
      case MARKETING_JOBS.PUSH_DELIVERY: {
        const { campaignId, channel } = job.data;
        if (campaignId && channel) {
          this.logger.debug(`deliver ${channel} campaign=${campaignId}`);
          await this.campaigns.complete(channel, campaignId);
        }
        break;
      }
      case MARKETING_JOBS.CAMPAIGN_SCHEDULER:
        this.logger.debug('campaign scheduler tick');
        break;
      case MARKETING_JOBS.SEARCH_ANALYTICS: {
        const q = job.data.query?.trim();
        if (!q) break;
        const existing = await this.repo.client.popularSearch.findFirst({
          where: { keyword: q, deleted_at: null },
        });
        if (existing) {
          await this.repo.client.popularSearch.update({
            where: { id: existing.id },
            data: {
              search_count: { increment: 1 },
              last_searched_at: new Date(),
            },
          });
        } else {
          await this.repo.client.popularSearch.create({
            data: { keyword: q, search_count: 1, last_searched_at: new Date() },
          });
        }
        break;
      }
      case MARKETING_JOBS.COUPON_EXPIRY:
      case MARKETING_JOBS.LOYALTY_EXPIRY:
      case MARKETING_JOBS.REC_REFRESH:
      case MARKETING_JOBS.REFERRAL_REWARDS:
        this.logger.debug(`ack job ${job.name}`);
        break;
      default:
        this.logger.warn(`unknown marketing job ${job.name}`);
    }
  }
}
