# Carrier Integration — Electronics Cart

## Partners

| Code | Role |
|------|------|
| `shiprocket` | **Primary** aggregator |
| `delhivery` | Direct / alternate |
| `bluedart` | Express / premium |
| `dtdc` | Surface / regional |
| `xpressbees` | E-commerce mid-mile |
| `india_post` | Economy / remote PIN |
| `dhl` / `fedex` / `ups` | Future international |

Config (API keys, webhook secrets) lives in app secrets / vault — `shipping_partners.config_json` holds non-secret flags only (account codes, defaults).

## Shiprocket (primary)

1. Auth token → create order/shipment on Shiprocket
2. Persist `partner_shipment_ref`, `awb_number`, `tracking_number`
3. Download label → `shipment_labels` (`label_url` and/or `media_files`)
4. Register webhook → `shipping_webhooks` (idempotent on `partner_id` + `idempotency_key`)
5. Map Shiprocket status → `shipment_status` enum

## AWB pool

Optional pre-fetched `awb_numbers` (`available` → `assigned` → `used`). Always denormalize assigned AWB onto `shipments.awb_number` for lookup indexes.

## Multi-carrier routing

`shipping_rules` (priority ASC): match warehouse + `conditions_json` (weight, COD, PIN zone) → `partner_id` / `service_id`.

## Webhooks

Reuse `webhook_processing_status` from Payments. Verify signature before applying tracking updates.
