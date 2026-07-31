# Returns & Exchanges Flow — Electronics Cart

## Returns

Statuses:

```
requested → approved → picked_up → received → inspection → refunded → completed
         ↘ rejected
```

### Tables

- `returns` — header (`return_number`, order link, refund_amount)
- `return_items` — which `order_items` + qty

### Steps

1. Customer requests return (reason on header/item)
2. Ops `approved` or `rejected`
3. Pickup → `picked_up` → warehouse `received`
4. `inspection` — quality gate
5. On pass: inventory `return_to_stock` (Phase 3) with source `customer_return`; mark serials back in stock
6. Refund (Phase 5) → `refunded` → `completed`; order may move to `returned` / `refunded`

## Exchanges

`exchange_requests`:

| `exchange_type` | Behaviour |
|-----------------|------------|
| `same_variant` | Replace unit (new serial) |
| `different_variant` | `to_variant_id` required; price delta handled in Payments |
| `store_credit` | `store_credit_amount`; wallet in Phase 5 |

Statuses: `requested` → `approved` → `fulfilled` | `rejected` | `cancelled`

## Link to inventory

Sales returns do **not** mutate catalog. After inspection, create Phase 3 `return_to_stock` (and movements) using `reference_type = 'return'` / `reference_id = returns.id`.
