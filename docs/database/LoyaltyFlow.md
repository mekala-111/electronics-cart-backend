# Loyalty Flow — Electronics Cart

## Account

One `loyalty_accounts` row per customer: `points_balance`, `lifetime_points`, `tier` (`bronze` → `platinum`).

## Earn / redeem

`loyalty_transactions`:

| `tx_type` | Meaning |
|-----------|---------|
| `earn` | Purchase / bonus |
| `redeem` | Checkout burn |
| `expire` | Point expiry job |
| `referral_bonus` | From referral program |
| `adjust` / `refund` | Ops corrections |

Store `expires_at` on earn rows; expiry job posts `expire` txs and decrements balance.

## Rules

`reward_rules` define earn rates (`points_per_rupee` or `fixed_points`), min order, expiry days, optional `tier_required`.

## Referrals

`referral_programs` set referrer/referee points. Successful referral → `referral_rewards` + loyalty txs.
