import { CouponService } from './coupon.service';
import { AppException } from '../../../core/errors/app.exception';
import { RuleEngine } from '../../../shared/rules';
import { ConditionEvaluator } from '../../../shared/rules/ConditionEvaluator';
import { OperatorRegistry } from '../../../shared/rules/OperatorRegistry';

describe('CouponService', () => {
  function build() {
    const coupon = {
      id: 'c1',
      code: 'SAVE10',
      discount_type: 'percentage',
      discount_value: 10,
      min_cart_value: 1000,
      max_discount: 500,
      usage_limit: 100,
      per_user_limit: 2,
      starts_at: null,
      expires_at: null,
      status: 'active',
      rules: [],
    };
    const repo = {
      client: {
        coupon: {
          findFirst: jest.fn(async () => coupon),
          create: jest.fn(async () => coupon),
        },
        couponRule: { createMany: jest.fn() },
        couponUsage: {
          count: jest.fn(async () => 0),
          create: jest.fn(async () => ({ id: 'u1' })),
        },
        order: {
          findFirst: jest.fn(async () => ({ id: 'o1', coupon_id: null })),
          update: jest.fn(),
        },
      },
      audit: jest.fn(),
    };
    const cache = {
      getOrSet: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
      invalidateCoupon: jest.fn(),
    };
    const locks = {
      withLock: jest.fn((_k: string, fn: () => Promise<unknown>) => fn()),
    };
    const events = {
      couponApplied: jest.fn(),
      couponRedeemed: jest.fn(),
    };
    const rules = new RuleEngine(new ConditionEvaluator(new OperatorRegistry()));
    const service = new CouponService(
      repo as never,
      cache as never,
      rules,
      locks as never,
      events as never,
    );
    return { service, events, repo };
  }

  it('validates coupon through RuleEngine', async () => {
    const { service, events } = build();
    const result = await service.validate('user-1', {
      code: 'SAVE10',
      cartTotal: 5000,
    });
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(500);
    expect(events.couponApplied).toHaveBeenCalled();
  });

  it('rejects below min cart', async () => {
    const { service } = build();
    const result = await service.validate('user-1', {
      code: 'SAVE10',
      cartTotal: 100,
    });
    expect(result.valid).toBe(false);
  });

  it('applies coupon under lock', async () => {
    const { service, events } = build();
    const result = await service.apply('user-1', {
      code: 'SAVE10',
      cartTotal: 5000,
      orderId: 'o1',
    });
    expect(result.usageId).toBe('u1');
    expect(events.couponRedeemed).toHaveBeenCalled();
  });
});
