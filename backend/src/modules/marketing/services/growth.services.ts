import { Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { LockService } from '../../../shared/lock/lock.service';
import { RuleEngine } from '../../../shared/rules';
import type { ConditionNode, Facts } from '../../../shared/rules';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import { QueueService } from '../../../shared/queue/queue.service';
import { MARKETING_CACHE, MARKETING_JOBS } from '../constants/marketing.constants';
import {
  ClaimReferralDto,
  CreateAbTestDto,
  CreateCampaignDto,
  CreateFeatureFlagDto,
  CreateRecommendationDto,
  CreateReferralProgramDto,
  CreateSearchKeywordDto,
  LoyaltyEarnDto,
  LoyaltyRedeemDto,
} from '../dto/marketing.dto';
import {
  AbTestExposureEvent,
  CampaignCompletedEvent,
  CampaignStartedEvent,
  FeatureFlagEvaluatedEvent,
  LoyaltyPointsEarnedEvent,
  LoyaltyPointsRedeemedEvent,
  RecommendationGeneratedEvent,
  ReferralCreatedEvent,
  SearchBoostAppliedEvent,
} from '../events/marketing.events';
import { MarketingEventPublisher } from '../events/marketing-event.publisher';
import { MarketingRepository } from '../repositories/marketing.repository';
import { buildRewardConditions } from '../utils/rule-builders';
import { MarketingCacheService } from './marketing-cache.service';

@Injectable()
export class FeatureFlagService {
  constructor(
    private readonly repo: MarketingRepository,
    private readonly cache: MarketingCacheService,
    private readonly rules: RuleEngine,
    private readonly events: MarketingEventPublisher,
  ) {}

  async create(actorId: string, dto: CreateFeatureFlagDto) {
    const flag = await this.repo.client.featureFlag.create({
      data: {
        code: dto.code,
        name: dto.name,
        status: dto.status ?? 'disabled',
        default_value: dto.defaultValue ?? false,
        created_by: actorId,
      },
    });
    if (dto.conditionsJson) {
      await this.repo.client.featureFlagRule.create({
        data: {
          flag_id: flag.id,
          conditions_json: dto.conditionsJson as never,
          rollout_percent: dto.rolloutPercent,
          created_by: actorId,
        },
      });
    }
    await this.cache.invalidateFlags();
    await this.repo.audit({
      entityType: 'feature_flag',
      entityId: flag.id,
      action: 'create',
      actorId,
    });
    return { id: flag.id, code: flag.code };
  }

  async listAndEvaluate(customerId?: string, factsExtra?: Facts) {
    const flags = await this.cache.getOrSet(MARKETING_CACHE.flags(), async () =>
      this.repo.client.featureFlag.findMany({
        where: { deleted_at: null },
        include: {
          rules: {
            where: { deleted_at: null, status: 'active' },
            orderBy: { priority: 'asc' },
          },
        },
      }),
    );

    const facts: Facts = {
      customer: { id: customerId ?? null },
      now: new Date().toISOString(),
      ...(factsExtra ?? {}),
    };

    return flags.map((f) => {
      let enabled = f.default_value;
      if (f.status === 'enabled') enabled = true;
      else if (f.status === 'disabled') enabled = false;
      else {
        enabled = f.default_value;
        for (const rule of f.rules) {
          const conditions = (rule.conditions_json ?? {
            all: [],
          }) as ConditionNode;
          const result = this.rules.evaluate(conditions, facts);
          if (result.matched) {
            enabled = rule.enabled_value;
            if (
              rule.rollout_percent != null &&
              customerId &&
              hashPercent(customerId + f.code) >= Number(rule.rollout_percent)
            ) {
              enabled = false;
            }
            break;
          }
        }
      }
      this.events.flagEvaluated(
        new FeatureFlagEvaluatedEvent({
          flagCode: f.code,
          enabled,
          customerId,
        }),
      );
      return { code: f.code, name: f.name, enabled };
    });
  }
}

function hashPercent(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h % 100;
}

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    private readonly repo: MarketingRepository,
    private readonly rules: RuleEngine,
    private readonly locks: LockService,
    private readonly events: MarketingEventPublisher,
  ) {}

  async ensureAccount(customerId: string) {
    let account = await this.repo.client.loyaltyAccount.findFirst({
      where: { customer_id: customerId, deleted_at: null },
    });
    if (!account) {
      account = await this.repo.client.loyaltyAccount.create({
        data: { customer_id: customerId, created_by: customerId },
      });
    }
    return account;
  }

  async createRewardRule(
    actorId: string,
    data: {
      code: string;
      name: string;
      pointsPerRupee?: number;
      fixedPoints?: number;
      minOrderAmount?: number;
      tierRequired?: string;
      expiryDays?: number;
    },
  ) {
    const row = await this.repo.client.rewardRule.create({
      data: {
        code: data.code,
        name: data.name,
        points_per_rupee: data.pointsPerRupee,
        fixed_points: data.fixedPoints,
        min_order_amount: data.minOrderAmount,
        tier_required: data.tierRequired as never,
        expiry_days: data.expiryDays,
        created_by: actorId,
      },
    });
    await this.repo.audit({
      entityType: 'reward_rule',
      entityId: row.id,
      action: 'create',
      actorId,
    });
    return { id: row.id, code: row.code };
  }

  async earn(actorId: string, dto: LoyaltyEarnDto) {
    return this.locks.withLock(
      LockService.resourceKey('marketing', 'loyalty', dto.customerId),
      async () => {
        const account = await this.ensureAccount(dto.customerId);
        const rule = dto.ruleCode
          ? await this.repo.client.rewardRule.findFirst({
              where: { code: dto.ruleCode, deleted_at: null, status: 'active' },
            })
          : await this.repo.client.rewardRule.findFirst({
              where: { deleted_at: null, status: 'active' },
              orderBy: { created_at: 'asc' },
            });
        if (!rule) {
          throw new AppException(ErrorCodes.NOT_FOUND, 'Reward rule not found', 404);
        }

        const conditions = buildRewardConditions({
          minOrderAmount:
            rule.min_order_amount != null ? Number(rule.min_order_amount) : null,
          tierRequired: rule.tier_required,
        });
        const facts: Facts = {
          order: { total: dto.orderTotal },
          customer: { id: dto.customerId, tier: account.tier },
          now: new Date().toISOString(),
        };
        const evaluated = this.rules.evaluate(conditions, facts);
        if (!evaluated.matched) {
          throw new AppException(
            ErrorCodes.CONFLICT,
            evaluated.reasons.join('; ') || 'Not eligible',
            409,
          );
        }

        const points =
          rule.fixed_points ??
          Math.floor(
            dto.orderTotal * Number(rule.points_per_rupee ?? 0),
          );
        if (points <= 0) {
          return { points: 0, balance: account.points_balance };
        }

        const balance = account.points_balance + points;
        await this.repo.client.$transaction(async (tx) => {
          await tx.loyaltyAccount.update({
            where: { id: account.id },
            data: {
              points_balance: balance,
              lifetime_points: { increment: points },
              updated_by: actorId,
            },
          });
          await tx.loyaltyTransaction.create({
            data: {
              account_id: account.id,
              tx_type: 'earn',
              points,
              balance_after: balance,
              reference_type: 'order',
              reference_id: dto.orderId,
              expires_at: rule.expiry_days
                ? new Date(Date.now() + rule.expiry_days * 86400000)
                : undefined,
              created_by: actorId,
            },
          });
        });

        this.events.loyaltyEarned(
          new LoyaltyPointsEarnedEvent({
            accountId: account.id,
            customerId: dto.customerId,
            points,
          }),
        );
        return { points, balance };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async redeem(customerId: string, dto: LoyaltyRedeemDto) {
    return this.locks.withLock(
      LockService.resourceKey('marketing', 'loyalty-redeem', customerId),
      async () => {
        const account = await this.ensureAccount(customerId);
        if (account.points_balance < dto.points) {
          throw new AppException(ErrorCodes.CONFLICT, 'Insufficient points', 409);
        }
        const balance = account.points_balance - dto.points;
        await this.repo.client.$transaction(async (tx) => {
          await tx.loyaltyAccount.update({
            where: { id: account.id },
            data: { points_balance: balance, updated_by: customerId },
          });
          await tx.loyaltyTransaction.create({
            data: {
              account_id: account.id,
              tx_type: 'redeem',
              points: -dto.points,
              balance_after: balance,
              notes: dto.notes,
              created_by: customerId,
            },
          });
        });
        this.events.loyaltyRedeemed(
          new LoyaltyPointsRedeemedEvent({
            accountId: account.id,
            customerId,
            points: dto.points,
          }),
        );
        return { points: dto.points, balance };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }
}

@Injectable()
export class ReferralService {
  constructor(
    private readonly repo: MarketingRepository,
    private readonly locks: LockService,
    private readonly events: MarketingEventPublisher,
    private readonly queues: QueueService,
  ) {}

  async createProgram(actorId: string, dto: CreateReferralProgramDto) {
    const row = await this.repo.client.referralProgram.create({
      data: {
        code: dto.code,
        name: dto.name,
        referrer_points: dto.referrerPoints ?? 0,
        referee_points: dto.refereePoints ?? 0,
        created_by: actorId,
      },
    });
    await this.repo.audit({
      entityType: 'referral_program',
      entityId: row.id,
      action: 'create',
      actorId,
    });
    return { id: row.id, code: row.code };
  }

  async claim(refereeId: string, dto: ClaimReferralDto) {
    return this.locks.withLock(
      LockService.resourceKey('marketing', 'referral', refereeId),
      async () => {
        if (dto.referrerId === refereeId) {
          throw new AppException(ErrorCodes.BAD_REQUEST, 'Cannot self-refer', 400);
        }
        const program = await this.repo.client.referralProgram.findFirst({
          where: {
            code: dto.programCode,
            deleted_at: null,
            status: 'active',
          },
        });
        if (!program) {
          throw new AppException(ErrorCodes.NOT_FOUND, 'Program not found', 404);
        }
        const existing = await this.repo.client.referralReward.findFirst({
          where: {
            program_id: program.id,
            referee_id: refereeId,
            deleted_at: null,
          },
        });
        if (existing) {
          throw new AppException(ErrorCodes.CONFLICT, 'Already referred', 409);
        }

        const points = program.referrer_points + program.referee_points;
        const reward = await this.repo.client.referralReward.create({
          data: {
            program_id: program.id,
            referrer_id: dto.referrerId,
            referee_id: refereeId,
            points_awarded: points,
            created_by: refereeId,
          },
        });

        this.events.referralCreated(
          new ReferralCreatedEvent({
            rewardId: reward.id,
            programId: program.id,
            referrerId: dto.referrerId,
            refereeId,
          }),
        );
        await this.queues.enqueue(
          QUEUE_NAMES.MARKETING,
          MARKETING_JOBS.REFERRAL_REWARDS,
          { rewardId: reward.id },
        );
        await this.repo.audit({
          entityType: 'referral_reward',
          entityId: reward.id,
          action: 'create',
          actorId: refereeId,
        });
        return { id: reward.id, pointsAwarded: points };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }
}

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private readonly repo: MarketingRepository,
    private readonly locks: LockService,
    private readonly events: MarketingEventPublisher,
    private readonly queues: QueueService,
  ) {}

  async create(actorId: string, dto: CreateCampaignDto) {
    const data = {
      name: dto.name,
      template_id: dto.templateId,
      status: 'draft' as const,
      scheduled_at: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      created_by: actorId,
    };

    let id: string;
    if (dto.channel === 'email') {
      const row = await this.repo.client.emailCampaign.create({
        data: { ...data, segment_id: dto.segmentId, subject: dto.subject },
      });
      id = row.id;
    } else if (dto.channel === 'sms') {
      const row = await this.repo.client.smsCampaign.create({
        data: {
          ...data,
          message: dto.message ?? dto.subject ?? dto.name,
          template_id: dto.templateId,
        },
      });
      id = row.id;
    } else if (dto.channel === 'push') {
      const row = await this.repo.client.pushCampaign.create({
        data: {
          ...data,
          title: dto.subject ?? dto.name,
          body: dto.message ?? dto.name,
          template_id: dto.templateId,
        },
      });
      id = row.id;
    } else {
      const row = await this.repo.client.notificationCampaign.create({
        data: {
          ...data,
          channel: 'email',
          segment_id: dto.segmentId,
          template_id: dto.templateId,
        },
      });
      id = row.id;
    }

    await this.repo.audit({
      entityType: 'campaign',
      entityId: id,
      action: 'create',
      actorId,
      next: { channel: dto.channel },
    });

    if (dto.launch) {
      await this.launch(actorId, dto.channel, id);
    }
    return { id, channel: dto.channel };
  }

  async launch(actorId: string, channel: string, campaignId: string) {
    return this.locks.withLock(
      LockService.resourceKey('marketing', 'campaign', campaignId),
      async () => {
        const now = new Date();
        if (channel === 'email') {
          await this.repo.client.emailCampaign.update({
            where: { id: campaignId },
            data: { status: 'running', started_at: now, updated_by: actorId },
          });
        } else if (channel === 'sms') {
          await this.repo.client.smsCampaign.update({
            where: { id: campaignId },
            data: { status: 'running', started_at: now, updated_by: actorId },
          });
        } else if (channel === 'push') {
          await this.repo.client.pushCampaign.update({
            where: { id: campaignId },
            data: { status: 'running', started_at: now, updated_by: actorId },
          });
        } else {
          await this.repo.client.notificationCampaign.update({
            where: { id: campaignId },
            data: { status: 'running', started_at: now, updated_by: actorId },
          });
        }

        this.events.campaignStarted(
          new CampaignStartedEvent({ campaignId, channel }),
        );
        const job =
          channel === 'sms'
            ? MARKETING_JOBS.SMS_DELIVERY
            : channel === 'push'
              ? MARKETING_JOBS.PUSH_DELIVERY
              : MARKETING_JOBS.EMAIL_DELIVERY;
        await this.queues.enqueue(QUEUE_NAMES.MARKETING, job, {
          campaignId,
          channel,
        });
        this.logger.log(`campaign launched ${campaignId} channel=${channel}`);
        return { id: campaignId, status: 'running' };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async complete(channel: string, campaignId: string) {
    const now = new Date();
    if (channel === 'email') {
      await this.repo.client.emailCampaign.update({
        where: { id: campaignId },
        data: { status: 'completed', completed_at: now },
      });
    }
    this.events.campaignCompleted(
      new CampaignCompletedEvent({ campaignId, channel }),
    );
  }
}

@Injectable()
export class SearchMarketingService {
  constructor(
    private readonly repo: MarketingRepository,
    private readonly cache: MarketingCacheService,
    private readonly events: MarketingEventPublisher,
    private readonly queues: QueueService,
  ) {}

  async createKeyword(actorId: string, dto: CreateSearchKeywordDto) {
    const row = await this.repo.client.searchKeyword.create({
      data: {
        keyword: dto.keyword,
        boost: dto.boost ?? 0,
        created_by: actorId,
        synonyms: dto.synonyms?.length
          ? {
              create: dto.synonyms.map((s) => ({
                synonym: s,
                created_by: actorId,
              })),
            }
          : undefined,
      },
    });
    if ((dto.boost ?? 0) > 0) {
      this.events.searchBoost(
        new SearchBoostAppliedEvent({
          keyword: dto.keyword,
          boost: dto.boost ?? 0,
        }),
      );
    }
    return { id: row.id, keyword: row.keyword };
  }

  async suggestions(q: string) {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return this.cache.getOrSet(MARKETING_CACHE.suggestions(query), async () => {
      const [keywords, popular, synonyms] = await Promise.all([
        this.repo.client.searchKeyword.findMany({
          where: {
            deleted_at: null,
            status: 'active',
            is_autocomplete: true,
            keyword: { contains: query, mode: 'insensitive' },
          },
          orderBy: { boost: 'desc' },
          take: 10,
        }),
        this.repo.client.popularSearch.findMany({
          where: {
            deleted_at: null,
            status: 'active',
            keyword: { contains: query, mode: 'insensitive' },
          },
          orderBy: { search_count: 'desc' },
          take: 5,
        }),
        this.repo.client.searchSynonym.findMany({
          where: {
            deleted_at: null,
            status: 'active',
            synonym: { contains: query, mode: 'insensitive' },
          },
          include: { keyword: true },
          take: 5,
        }),
      ]);
      await this.queues.enqueue(
        QUEUE_NAMES.MARKETING,
        MARKETING_JOBS.SEARCH_ANALYTICS,
        { query },
      );
      const suggestions = [
        ...keywords.map((k) => ({
          text: k.keyword,
          boost: k.boost,
          source: 'keyword' as const,
        })),
        ...popular.map((p) => ({
          text: p.keyword,
          boost: 0,
          source: 'popular' as const,
        })),
        ...synonyms.map((s) => ({
          text: s.keyword.keyword,
          boost: s.keyword.boost,
          source: 'synonym' as const,
        })),
      ];
      const seen = new Set<string>();
      return suggestions.filter((s) => {
        const key = s.text.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
  }
}

@Injectable()
export class RecommendationService {
  constructor(
    private readonly repo: MarketingRepository,
    private readonly cache: MarketingCacheService,
    private readonly rules: RuleEngine,
    private readonly events: MarketingEventPublisher,
  ) {}

  async create(actorId: string, dto: CreateRecommendationDto) {
    const row = await this.repo.client.productRecommendation.create({
      data: {
        product_id: dto.productId,
        recommended_product_id: dto.recommendedProductId,
        source: 'manual',
        score: dto.score,
        created_by: actorId,
      },
    });
    // Optional eligibility stored on segment-like Json via audit metadata
    if (dto.conditionsJson) {
      await this.repo.audit({
        entityType: 'recommendation_rule',
        entityId: row.id,
        action: 'conditions',
        actorId,
        next: dto.conditionsJson,
      });
    }
    await this.cache.invalidateRecs(dto.productId);
    return { id: row.id };
  }

  async list(
    productId: string | undefined,
    customerId: string | undefined,
    type?: string,
  ) {
    if (type === 'recent' && customerId) {
      const recent = await this.repo.client.recentlyViewedProduct.findMany({
        where: { customer_id: customerId, deleted_at: null },
        orderBy: { viewed_at: 'desc' },
        take: 12,
      });
      return recent.map((r) => ({
        productId: r.product_id,
        source: 'recent',
      }));
    }

    if (!productId) {
      return [];
    }

    return this.cache.getOrSet(MARKETING_CACHE.recs(productId), async () => {
      const rows = await this.repo.client.productRecommendation.findMany({
        where: {
          product_id: productId,
          deleted_at: null,
          status: 'active',
        },
        orderBy: [{ sort_order: 'asc' }, { score: 'desc' }],
        take: 20,
      });

      const facts: Facts = {
        customer: { id: customerId ?? null },
        product: { id: productId },
        now: new Date().toISOString(),
      };

      const out = [];
      for (const r of rows) {
        const audit = await this.repo.client.auditLog.findFirst({
          where: {
            entity_type: 'recommendation_rule',
            entity_id: r.id,
            action: 'conditions',
          },
          orderBy: { created_at: 'desc' },
        });
        if (audit?.new_values) {
          const result = this.rules.evaluate(
            audit.new_values as ConditionNode,
            facts,
          );
          if (!result.matched) continue;
        }
        out.push({
          id: r.id,
          productId: r.product_id,
          recommendedProductId: r.recommended_product_id,
          score: r.score != null ? Number(r.score) : null,
          source: r.source,
        });
      }

      this.events.recommendationGenerated(
        new RecommendationGeneratedEvent({
          productId,
          count: out.length,
        }),
      );
      return out;
    });
  }
}

@Injectable()
export class AbTestService {
  constructor(
    private readonly repo: MarketingRepository,
    private readonly events: MarketingEventPublisher,
  ) {}

  async create(actorId: string, dto: CreateAbTestDto) {
    const test = await this.repo.client.abTest.create({
      data: {
        code: dto.code,
        name: dto.name,
        target_type: dto.targetType,
        target_key: dto.targetKey,
        status: 'draft',
        created_by: actorId,
        variants: {
          create: dto.variants.map((v) => ({
            code: v.code,
            name: v.name,
            is_control: v.isControl ?? false,
            weight_percent: v.weightPercent,
            config_json: v.configJson as never,
            created_by: actorId,
          })),
        },
      },
      include: { variants: true },
    });
    await this.repo.audit({
      entityType: 'ab_test',
      entityId: test.id,
      action: 'create',
      actorId,
    });
    return {
      id: test.id,
      code: test.code,
      variants: test.variants.map((v) => ({
        id: v.id,
        code: v.code,
        weightPercent: Number(v.weight_percent),
      })),
    };
  }

  async expose(testCode: string, customerId?: string) {
    const test = await this.repo.client.abTest.findFirst({
      where: { code: testCode, deleted_at: null, status: 'running' },
      include: {
        variants: { where: { deleted_at: null, status: 'active' } },
      },
    });
    if (!test || !test.variants.length) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'A/B test not found', 404);
    }
    const bucket = hashPercent((customerId ?? 'anon') + test.id);
    let cursor = 0;
    let chosen = test.variants[0]!;
    for (const v of test.variants) {
      cursor += Number(v.weight_percent);
      if (bucket < cursor) {
        chosen = v;
        break;
      }
    }
    await this.repo.client.abTestResult.create({
      data: {
        test_id: test.id,
        variant_id: chosen.id,
        metric_key: 'exposure',
        metric_value: 1,
        sample_size: 1,
        created_by: customerId,
      },
    });
    this.events.abExposure(
      new AbTestExposureEvent({
        testId: test.id,
        variantId: chosen.id,
        customerId,
      }),
    );
    return {
      testId: test.id,
      variantId: chosen.id,
      variantCode: chosen.code,
      config: chosen.config_json,
    };
  }
}

@Injectable()
export class MarketingDashboardService {
  constructor(private readonly repo: MarketingRepository) {}

  async dashboard() {
    const [
      publishedPages,
      activeCoupons,
      runningEmail,
      flags,
      abRunning,
      loyaltyAccounts,
    ] = await Promise.all([
      this.repo.client.cmsPage.count({
        where: { status: 'published', deleted_at: null },
      }),
      this.repo.client.coupon.count({
        where: { status: 'active', deleted_at: null },
      }),
      this.repo.client.emailCampaign.count({
        where: { status: 'running', deleted_at: null },
      }),
      this.repo.client.featureFlag.count({ where: { deleted_at: null } }),
      this.repo.client.abTest.count({
        where: { status: 'running', deleted_at: null },
      }),
      this.repo.client.loyaltyAccount.count({ where: { deleted_at: null } }),
    ]);
    return {
      publishedPages,
      activeCoupons,
      runningEmailCampaigns: runningEmail,
      featureFlags: flags,
      runningAbTests: abRunning,
      loyaltyAccounts,
    };
  }
}
