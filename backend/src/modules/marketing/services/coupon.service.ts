import { Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { TransactionContext } from '../../../shared/context/transaction-context';
import { LockService } from '../../../shared/lock/lock.service';
import { RuleEngine } from '../../../shared/rules';
import type { ConditionNode, Facts } from '../../../shared/rules';
import { MARKETING_CACHE } from '../constants/marketing.constants';
import { ApplyCouponDto, CreateCouponDto, ValidateCouponDto } from '../dto/marketing.dto';
import {
  CouponAppliedEvent,
  CouponRedeemedEvent,
} from '../events/marketing.events';
import { MarketingEventPublisher } from '../events/marketing-event.publisher';
import { MarketingRepository } from '../repositories/marketing.repository';
import {
  buildCouponConditions,
  computeCouponDiscount,
} from '../utils/rule-builders';
import { MarketingCacheService } from './marketing-cache.service';

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(
    private readonly repo: MarketingRepository,
    private readonly cache: MarketingCacheService,
    private readonly rules: RuleEngine,
    private readonly locks: LockService,
    private readonly events: MarketingEventPublisher,
  ) {}

  async create(actorId: string, dto: CreateCouponDto) {
    const code = dto.code.toUpperCase();
    const existing = await this.repo.client.coupon.findFirst({
      where: { code, deleted_at: null },
    });
    if (existing) {
      throw new AppException(ErrorCodes.CONFLICT, 'Coupon code exists', 409);
    }

    const coupon = await this.repo.client.coupon.create({
      data: {
        code,
        name: dto.name,
        discount_type: dto.discountType,
        discount_value: dto.discountValue,
        min_cart_value: dto.minCartValue,
        max_discount: dto.maxDiscount,
        usage_limit: dto.usageLimit,
        per_user_limit: dto.perUserLimit,
        starts_at: dto.startsAt ? new Date(dto.startsAt) : undefined,
        expires_at: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        created_by: actorId,
      },
    });

    const ruleRows: Array<{
      coupon_id: string;
      rule_type: 'brand' | 'category' | 'min_cart_value' | 'max_discount' | 'usage_limit' | 'per_user_limit';
      brand_id?: string;
      category_id?: string;
      rule_value?: number;
      created_by: string;
    }> = [];

    for (const brandId of dto.brandIds ?? []) {
      ruleRows.push({
        coupon_id: coupon.id,
        rule_type: 'brand',
        brand_id: brandId,
        created_by: actorId,
      });
    }
    for (const categoryId of dto.categoryIds ?? []) {
      ruleRows.push({
        coupon_id: coupon.id,
        rule_type: 'category',
        category_id: categoryId,
        created_by: actorId,
      });
    }
    if (ruleRows.length) {
      await this.repo.client.couponRule.createMany({ data: ruleRows });
    }

    await this.repo.audit({
      entityType: 'coupon',
      entityId: coupon.id,
      action: 'create',
      actorId,
      next: { code },
    });
    await this.cache.invalidateCoupon(code);
    return { id: coupon.id, code: coupon.code };
  }

  async validate(customerId: string | undefined, dto: ValidateCouponDto) {
    const coupon = await this.loadCoupon(dto.code);
    const result = await this.evaluateEligibility(coupon, customerId, dto);
    if (!result.eligible) {
      return {
        valid: false,
        reasons: result.reasons,
        errors: result.errors,
      };
    }
    const discount = computeCouponDiscount({
      discountType: coupon.discount_type,
      discountValue: Number(coupon.discount_value),
      cartTotal: dto.cartTotal,
      maxDiscount: coupon.max_discount != null ? Number(coupon.max_discount) : null,
    });
    this.events.couponApplied(
      new CouponAppliedEvent({
        couponId: coupon.id,
        code: coupon.code,
        customerId,
        discount,
      }),
    );
    return {
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discount,
      reasons: result.reasons,
    };
  }

  async apply(customerId: string, dto: ApplyCouponDto) {
    return this.locks.withLock(
      LockService.resourceKey('marketing', 'coupon', dto.code.toUpperCase()),
      async () => {
        const validated = await this.validate(customerId, dto);
        if (!validated.valid || !validated.couponId) {
          throw new AppException(
            ErrorCodes.CONFLICT,
            validated.reasons?.join('; ') || 'Coupon not eligible',
            409,
          );
        }

        // # ponytail: stacking unsupported — Order has single coupon_id
        if (dto.orderId) {
          const order = await this.repo.client.order.findFirst({
            where: { id: dto.orderId, deleted_at: null },
          });
          if (!order) {
            throw new AppException(ErrorCodes.NOT_FOUND, 'Order not found', 404);
          }
          if (order.coupon_id && order.coupon_id !== validated.couponId) {
            throw new AppException(
              ErrorCodes.CONFLICT,
              'Coupon stacking not allowed',
              409,
            );
          }
          await this.repo.client.order.update({
            where: { id: dto.orderId },
            data: { coupon_id: validated.couponId, updated_by: customerId },
          });
        }

        const usage = await this.repo.client.couponUsage.create({
          data: {
            coupon_id: validated.couponId,
            user_id: customerId,
            order_id: dto.orderId,
            discount_amount: validated.discount ?? 0,
            created_by: customerId,
          },
        });

        this.events.couponRedeemed(
          new CouponRedeemedEvent({
            couponId: validated.couponId,
            usageId: usage.id,
            customerId,
            orderId: dto.orderId,
          }),
        );
        await this.repo.audit({
          entityType: 'coupon',
          entityId: validated.couponId,
          action: 'redeem',
          actorId: customerId,
        });
        this.logger.log(
          `coupon applied code=${dto.code} corr=${TransactionContext.get()?.correlationId}`,
        );
        return {
          usageId: usage.id,
          couponId: validated.couponId,
          discount: validated.discount,
        };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  private async loadCoupon(code: string) {
    const key = code.toUpperCase();
    return this.cache.getOrSet(MARKETING_CACHE.coupon(key), async () => {
      const coupon = await this.repo.client.coupon.findFirst({
        where: { code: key, deleted_at: null },
        include: { rules: { where: { deleted_at: null, status: 'active' } } },
      });
      if (!coupon || coupon.status !== 'active') {
        throw new AppException(ErrorCodes.NOT_FOUND, 'Coupon not found', 404);
      }
      return coupon;
    });
  }

  private async evaluateEligibility(
    coupon: Awaited<ReturnType<CouponService['loadCoupon']>>,
    customerId: string | undefined,
    dto: ValidateCouponDto,
  ) {
    const restrictedBrands = coupon.rules
      .filter((r) => r.rule_type === 'brand' && r.brand_id)
      .map((r) => r.brand_id!);
    const restrictedCategories = coupon.rules
      .filter((r) => r.rule_type === 'category' && r.category_id)
      .map((r) => r.category_id!);

    const conditions = buildCouponConditions({
      minCartValue:
        coupon.min_cart_value != null
          ? Number(coupon.min_cart_value)
          : coupon.rules.find((r) => r.rule_type === 'min_cart_value')?.rule_value != null
            ? Number(coupon.rules.find((r) => r.rule_type === 'min_cart_value')!.rule_value)
            : null,
      startsAt: coupon.starts_at,
      expiresAt: coupon.expires_at,
      extra: this.restrictionNode(
        restrictedBrands,
        restrictedCategories,
        dto.brandIds ?? [],
        dto.categoryIds ?? [],
      ),
    });

    const facts: Facts = {
      cart: {
        total: dto.cartTotal,
        brandIds: dto.brandIds ?? [],
        categoryIds: dto.categoryIds ?? [],
        productIds: dto.productIds ?? [],
      },
      customer: { id: customerId ?? null },
      now: new Date().toISOString(),
    };

    const evaluated = this.rules.evaluate(conditions, facts);
    if (!evaluated.matched || evaluated.errors?.length) {
      return {
        eligible: false,
        reasons: evaluated.reasons,
        errors: evaluated.errors,
      };
    }

    if (coupon.usage_limit != null) {
      const used = await this.repo.client.couponUsage.count({
        where: { coupon_id: coupon.id, deleted_at: null },
      });
      if (used >= coupon.usage_limit) {
        return { eligible: false, reasons: ['usage_limit exceeded'] };
      }
    }
    if (coupon.per_user_limit != null && customerId) {
      const used = await this.repo.client.couponUsage.count({
        where: { coupon_id: coupon.id, user_id: customerId, deleted_at: null },
      });
      if (used >= coupon.per_user_limit) {
        return { eligible: false, reasons: ['per_user_limit exceeded'] };
      }
    }

    return { eligible: true, reasons: evaluated.reasons };
  }

  private restrictionNode(
    brands: string[],
    categories: string[],
    cartBrands: string[],
    cartCategories: string[],
  ): ConditionNode | null {
    const parts: ConditionNode[] = [];
    if (brands.length) {
      // Match if any restricted brand is in cart brandIds via contains on facts we set
      parts.push({
        any: brands.map((id) => ({
          field: 'cart.brandIds',
          contains: id,
        })),
      });
    }
    if (categories.length) {
      parts.push({
        any: categories.map((id) => ({
          field: 'cart.categoryIds',
          contains: id,
        })),
      });
    }
    void cartBrands;
    void cartCategories;
    if (!parts.length) return null;
    return parts.length === 1 ? parts[0]! : { all: parts };
  }
}
