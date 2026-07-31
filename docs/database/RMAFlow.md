# RMA Flow — Electronics Cart

## Types

| `rma_type` | Meaning |
|------------|---------|
| `doa` | Dead on arrival |
| `warranty_repair` | Send-in / bench repair under warranty |
| `replacement` | Unit swap |
| `refund` | Money-back path |

## Status

`requested` → `approved` → `in_transit` → `received` → `completed`  
(or `rejected` / `cancelled`)

## Links

- `order_id` / `order_item_id` / `serial_number_id`
- Optional `claim_id`, `ticket_id`

## Replacements

`replacement_requests.replacement_type`:

- `same_variant` / `different_variant` / `upgrade` / `store_credit`

Line detail in `replacement_items` (`from_variant` / `to_variant`, optional serials). Store-credit path uses Phase 4 wallets / store credits in app.
