import type { ConditionNode } from '../../../shared/rules';

/** Build RuleEngine trees from locked coupon columns / CouponRule rows. */
export function buildCouponConditions(input: {
  minCartValue?: number | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  brandIds?: string[];
  categoryIds?: string[];
  extra?: ConditionNode | null;
}): ConditionNode {
  const parts: ConditionNode[] = [];
  if (input.minCartValue != null) {
    parts.push({ field: 'cart.total', gte: Number(input.minCartValue) });
  }
  if (input.startsAt) {
    parts.push({
      field: 'now',
      gte: input.startsAt.toISOString(),
    });
  }
  if (input.expiresAt) {
    parts.push({
      field: 'now',
      lte: input.expiresAt.toISOString(),
    });
  }
  if (input.brandIds?.length) {
    parts.push({
      any: input.brandIds.map((id) => ({
        field: 'cart.brandIds',
        contains: id,
      })),
    });
  }
  if (input.categoryIds?.length) {
    parts.push({
      any: input.categoryIds.map((id) => ({
        field: 'cart.categoryIds',
        contains: id,
      })),
    });
  }
  if (input.extra) parts.push(input.extra);
  if (parts.length === 0) return { all: [] };
  if (parts.length === 1) return parts[0]!;
  return { all: parts };
}

export function buildRewardConditions(input: {
  minOrderAmount?: number | null;
  tierRequired?: string | null;
}): ConditionNode {
  const parts: ConditionNode[] = [];
  if (input.minOrderAmount != null) {
    parts.push({ field: 'order.total', gte: Number(input.minOrderAmount) });
  }
  if (input.tierRequired) {
    parts.push({ field: 'customer.tier', eq: input.tierRequired });
  }
  return parts.length ? { all: parts } : { all: [] };
}

export function computeCouponDiscount(input: {
  discountType: string;
  discountValue: number;
  cartTotal: number;
  maxDiscount?: number | null;
}): number {
  let amount =
    input.discountType === 'percentage'
      ? (input.cartTotal * input.discountValue) / 100
      : input.discountValue;
  if (input.maxDiscount != null) {
    amount = Math.min(amount, Number(input.maxDiscount));
  }
  return Math.max(0, Math.min(amount, input.cartTotal));
}
