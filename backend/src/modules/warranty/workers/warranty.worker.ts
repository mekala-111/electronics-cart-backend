import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { CaseManager } from '../../../shared/case-management';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import { QueueService } from '../../../shared/queue/queue.service';
import { BaseWorker } from '../../../shared/queue/worker.base';
import { WARRANTY_JOBS } from '../constants/warranty.constants';
import { WarrantyRepository } from '../repositories/warranty.repository';

type WarrantyJob =
  | { claimId: string }
  | { ticketId: string }
  | { repairJobId: string }
  | { caseKind: string; caseId: string }
  | { registrationId: string }
  | Record<string, unknown>;

@Injectable()
export class WarrantyWorker
  extends BaseWorker<WarrantyJob>
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    queueService: QueueService,
    config: ConfigService,
    private readonly cases: CaseManager,
    private readonly repo: WarrantyRepository,
  ) {
    super(
      QUEUE_NAMES.WARRANTY,
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

  protected async process(job: Job<WarrantyJob>): Promise<void> {
    switch (job.name) {
      case WARRANTY_JOBS.CLAIM_REVIEW: {
        const data = job.data as { claimId: string };
        this.logger.debug(`claim review queued claimId=${data.claimId}`);
        break;
      }
      case WARRANTY_JOBS.TECH_ASSIGN: {
        const data = job.data as { ticketId: string };
        this.logger.debug(`tech assign hint ticketId=${data.ticketId}`);
        break;
      }
      case WARRANTY_JOBS.REPAIR_NOTIFY: {
        const data = job.data as { repairJobId: string };
        this.logger.debug(`repair notify repairJobId=${data.repairJobId}`);
        break;
      }
      case WARRANTY_JOBS.SLA_MONITOR:
      case WARRANTY_JOBS.ESCALATION: {
        const data = job.data as { caseKind?: string; caseId?: string };
        if (data.caseKind && data.caseId) {
          await this.cases.evaluateSla({
            kind: data.caseKind as never,
            id: data.caseId,
          });
        }
        break;
      }
      case WARRANTY_JOBS.EXPIRY_REMINDER: {
        const soon = new Date();
        soon.setDate(soon.getDate() + 30);
        const expiring = await this.repo.client.warrantyRegistration.count({
          where: {
            status: 'active',
            deleted_at: null,
            end_date: { lte: soon },
          },
        });
        this.logger.log(`warranty expiry reminder candidates=${expiring}`);
        break;
      }
      case WARRANTY_JOBS.APPOINTMENT_REMINDER:
        this.logger.debug(`ack job ${job.name}`);
        break;
      default:
        this.logger.warn(`unknown warranty job ${job.name}`);
    }
  }
}
