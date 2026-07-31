# Coupon Engine

1. Load coupon + `CouponRule` rows.  
2. Build `ConditionNode` via `buildCouponConditions` (min cart, dates, brand/category).  
3. `RuleEngine.evaluate(conditions, facts)`.  
4. Enforce usage / per-user limits in service.  
5. Discount via `flat` | `percentage` (+ `max_discount`).  
6. Apply under lock → `CouponUsage` (+ optional `Order.coupon_id`). Stacking rejected.

Events: `coupon.applied`, `coupon.redeemed`.
