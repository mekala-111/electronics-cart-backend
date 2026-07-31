# Order Flow — Electronics Cart

Phase 4 sales order lifecycle. Payments (capture/refund) land in Phase 5; shipping carriers in Phase 6.

## Status machine

```
pending → confirmed → processing → packed → shipped → delivered → completed
                ↘ cancelled
delivered/completed → returned → refunded   (via returns module)
```

Every transition inserts `order_status_history` and an `order_events` row (`status_changed`).

## Create order (from cart)

1. Lock cart + inventory reservations
2. Validate coupon (`coupons` + `coupon_rules` + usage limits)
3. Snapshot line prices / GST / warranty into `order_items`
4. Insert `orders` (`pending`), shipping + billing `order_addresses`
5. Consume reservations (`stock_reservations.status = consumed`, set `order_id`)
6. Mark cart `converted`
7. Record `coupon_usage` if applicable
8. Emit `order_events` (`created`, `coupon_applied`)

## Fulfilment (ops)

| Status | Meaning |
|--------|---------|
| `confirmed` | Payment accepted (Phase 5 writes this) |
| `processing` | Warehouse allocated (`fulfillment_warehouse_id`) |
| `packed` | Serials assigned on lines where required |
| `shipped` | Handed to carrier (Phase 6 tracking) |
| `delivered` | Customer received |
| `completed` | Return window closed / settled |

## Cancellations

- Allowed until `shipped` (policy-enforced in app)
- Set `cancelled_at`, status `cancelled`
- Release unused reservations; inventory movement `return_in` / reservation release as needed

## Invoices

- Issued after `confirmed` (or on ship — policy)
- Snapshot-only: `invoices` / `invoice_items` never join live catalog prices
- Intra-state: CGST + SGST; inter-state: IGST

## Multi-warehouse fulfillment (split ship)

One sales order can produce many `fulfillment_orders` (one per warehouse):

```
order EC-…
  ├─ FF-…-HYD  → pick_list → packing_list → ship
  └─ FF-…-BLR  → pick_list → packing_list → ship
```

`fulfillment_items` allocate `order_items` qty across warehouses. Order-level `status` rolls up from fulfillments (app logic).

## Wallet / store credit / gift cards

- `wallets` + `wallet_transactions` — balance ledger (refunds, promo, exchange remainder)
- `store_credits` — issued grants with remaining + expiry; redeem posts wallet credit/debit
- `gift_cards` + `gift_card_transactions` — prepaid codes (marketing)

## Fraud

- `order_risk_scores` — composite score + `risk_level`
- `risk_events` — signals (failed payments, device mismatch, high value, …)

## Cancellation

Prefer `orders.cancellation_reason_id` → `cancellation_reasons` over free text.

## Invoice PDFs

`invoice_documents.invoice_pdf_file_id` → `media_files` (S3 object; never raw URL on invoice).
