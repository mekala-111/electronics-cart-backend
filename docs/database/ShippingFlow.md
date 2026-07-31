# Shipping Flow — Electronics Cart

Phase 6 logistics lifecycle. Primary carrier integration: **Shiprocket**. Orders and fulfillment orders remain allocation source of truth.

## Split shipments

One `orders` row may have many `shipments`. Each shipment:

- belongs to **one** `warehouse_id`
- optionally links to one `fulfillment_orders` row
- contains one or more `shipment_items` (from `order_items`)
- may contain multiple `shipment_packages`

## Happy path

```
1. Fulfillment allocated (Phase 4) → warehouse known
2. shipping_rules pick partner/service (Shiprocket Surface default for HYD)
3. Create shipments + shipment_items + shipment_packages
4. Assign awb_numbers → copy awb/tracking onto shipments
5. Generate shipment_labels (PDF/ZPL)
6. Schedule pickup_requests (warehouse window from pickup_schedules)
7. Carrier pickup → status packed → dispatched
8. Webhooks + polls update shipment_tracking + tracking_events
9. Delivered → delivery_proofs (name, OTP, signature, photo, geo)
```

## Status machine

```
created → packed → dispatched → in_transit → out_for_delivery → delivered
                                              ↘ delivery_failed → (retry / RTO)
delivered / failed paths may also end: returned | lost | damaged | cancelled
```

Mirror current status on `shipment_tracking`; append every hop to `tracking_events`.

## Exceptions

Store carrier exception codes on `tracking_events.exception_code` and `delivery_attempts`. Failed OFD attempts increment `delivery_attempts.attempt_number`.

## Rate selection

`shipping_zones` → `shipping_rate_cards` → `shipping_rates` (weight slabs). Override via `shipping_rules` priority per warehouse.

## Cost breakdown

Prefer `shipping_cost_breakdown` (base, fuel, handling, insurance, COD, tax) over a single `shipments.shipping_charge`. Keep `shipping_charge` as denormalized total for list UIs.

## Insurance

High-value electronics: `shipment_insurance` (provider, insured_value, premium, claim_status).

## SLA & slots

- `carrier_sla` — promised/average days + success_rate for partner selection
- `delivery_slots` — premium scheduled delivery windows
- `pickup_points` — customer pickup / locker (`shipments.pickup_point_id`)
- `shipment_eta_history` — every ETA change (`old_eta` → `new_eta` + reason)

## Failed deliveries

Normalize via `delivery_failure_reasons`; link on `delivery_attempts.failure_reason_id`.
