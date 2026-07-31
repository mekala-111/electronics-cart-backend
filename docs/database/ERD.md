# ERD — Electronics Cart Database

## Phase 1 Authentication (approved — locked)

Auth tables are frozen except FK targets from later phases (`users.id`).

## Phase 2 Catalog (approved — locked)

Catalog tables are frozen except FK targets (`product_variants.id`).

## Phase 3 Inventory (approved — locked)

```mermaid
erDiagram
  warehouses ||--o{ warehouse_zones : zones
  warehouse_zones ||--o{ warehouse_racks : racks
  warehouse_racks ||--o{ warehouse_bins : bins
  warehouse_bins ||--o{ inventory : stocks
  warehouse_bins ||--o{ inventory_batches : lots
  warehouses ||--o| warehouse_capacity : capacity
  warehouses ||--o{ cycle_count_jobs : counts
  cycle_count_jobs ||--o{ cycle_count_items : lines
  suppliers ||--o{ inventory_batches : sourced
  suppliers ||--o{ purchase_cost_history : priced
  suppliers ||--o{ supplier_scorecards : scored
  product_variants ||--o{ inventory : stocked_as
  product_variants ||--o{ inventory_batches : batched
  product_variants ||--o{ purchase_cost_history : costed
  product_variants ||--o{ inventory_forecast : forecasted
  product_variants ||--o{ return_to_stock : returned
  warehouses ||--o{ return_to_stock : restocks

  warehouse_bins {
    uuid id PK
    uuid rack_id FK
    varchar code
  }

  inventory {
    uuid id PK
    uuid warehouse_id FK
    uuid bin_id FK
    uuid variant_id FK
  }

  inventory_batches {
    uuid id PK
    varchar batch_number
    varchar supplier_batch
    date manufactured_date
    date expiry_date
  }

  purchase_cost_history {
    uuid id PK
    uuid variant_id FK
    uuid supplier_id FK
    numeric cost_price
    date effective_from
    date effective_to
  }

  return_to_stock {
    uuid id PK
    return_to_stock_source source
    return_to_stock_status status
  }

  inventory_forecast {
    uuid id PK
    uuid variant_id FK
    int expected_sales
    int recommended_purchase
    date forecast_date
  }

  supplier_scorecards {
    uuid id PK
    uuid supplier_id FK
    numeric on_time_delivery
    numeric quality_score
    numeric return_rate
    int average_lead_time
  }

  warehouse_capacity {
    uuid id PK
    uuid warehouse_id UK
    int maximum_units
    int occupied_units
  }

  cycle_count_jobs {
    uuid id PK
    varchar job_number UK
    cycle_count_status status
  }
```

### Inventory tables

| Table | Role |
|-------|------|
| `warehouses` | Multi-DC master |
| `warehouse_zones` / `warehouse_racks` / `warehouse_bins` | Location tree |
| `warehouse_capacity` | Max vs occupied units |
| `suppliers` / `supplier_contacts` / `supplier_scorecards` | Vendor + KPIs |
| `inventory` | Qty buckets (**bin × variant**) |
| `inventory_batches` | Lot / batch / expiry |
| `purchase_cost_history` | Supplier cost dating |
| `inventory_movements` | Stock ledger |
| `stock_reservations` | Checkout holds |
| `serial_numbers` | Unit / IMEI / refurb |
| `purchase_orders` / items · `goods_receipts` / items | Procurement |
| `stock_transfers` / items | Inter-warehouse |
| `return_to_stock` | Customer / warranty / service / open-box |
| `inventory_forecast` | Demand / buy plan |
| `inventory_adjustments` | Corrections |
| `cycle_count_jobs` / `cycle_count_items` | Cycle counts |
| `low_stock_alerts` | Reorder notifications |

### Design notes

- Hierarchy: **warehouse → zone → rack → bin → inventory**.
- Stock at **bin** level; warehouse availability is `SUM` over bins.
- `inventory_audits` replaced by `cycle_count_jobs` + `cycle_count_items`.
- `cart_id` / `order_id` on reservations are UUID placeholders until Phase 4 Orders.
- Refurbishment stays on `serial_numbers.refurbishment_status`.

## Phase 4 Orders & Sales (approved — locked)

```mermaid
erDiagram
  users ||--o{ carts : owns
  carts ||--o{ cart_items : lines
  users ||--o{ wishlists : saves
  wishlists ||--o{ wishlist_items : lines
  carts ||--o{ saved_for_later : parked
  coupons ||--o{ coupon_rules : rules
  coupons ||--o{ coupon_usage : redemptions
  users ||--o{ orders : places
  carts ||--o{ orders : converts
  coupons ||--o{ orders : discounts
  orders ||--o{ order_items : lines
  orders ||--o{ order_addresses : ships_bills
  orders ||--o{ order_status_history : audit
  orders ||--o{ order_notes : notes
  orders ||--o{ order_events : timeline
  orders ||--o{ invoices : billed
  invoices ||--o{ invoice_items : lines
  orders ||--o{ returns : returns
  returns ||--o{ return_items : lines
  orders ||--o{ exchange_requests : exchanges
  product_variants ||--o{ order_items : sold_as
  serial_numbers ||--o{ order_items : assigned

  orders {
    uuid id PK
    varchar order_number UK
    uuid customer_id FK
    order_status status
    numeric grand_total
  }

  order_items {
    uuid id PK
    uuid order_id FK
    uuid variant_id FK
    uuid serial_number_id FK
    numeric unit_price
    numeric gst_amount
  }

  coupons {
    uuid id PK
    varchar code UK
    coupon_discount_type discount_type
  }

  invoices {
    uuid id PK
    varchar invoice_number UK
    uuid order_id FK
  }

  returns {
    uuid id PK
    varchar return_number UK
    return_status status
  }
```

### Orders tables

| Table | Role |
|-------|------|
| `carts` / `cart_items` | Guest + user carts |
| `wishlists` / `wishlist_items` | Saved products |
| `saved_for_later` | Parked cart lines |
| `coupons` / `coupon_rules` / `coupon_usage` | Promotions |
| `orders` / `order_items` | Sales orders + price/GST/warranty snapshots |
| `order_addresses` | Shipping + billing snapshots |
| `order_status_history` | Status audit trail |
| `order_notes` | Internal / customer notes |
| `order_events` | Timeline |
| `invoices` / `invoice_items` | GST invoice snapshots |
| `returns` / `return_items` | RMA |
| `exchange_requests` | Same / different variant / store credit |
| `wallets` / `wallet_transactions` / `store_credits` | Refunds, promo, exchange balance |
| `gift_cards` / `gift_card_transactions` | Prepaid gift codes |
| `fulfillment_orders` / `fulfillment_items` | Split ship per warehouse |
| `pick_lists` / `packing_lists` | WMS pick/pack |
| `order_risk_scores` / `risk_events` | Fraud signals |
| `invoice_documents` | PDF via `media_files` |
| `cancellation_reasons` | Normalized cancel codes |

### Design notes

- Line snapshots freeze catalog changes after purchase.
- `stock_reservations.cart_id` / `order_id` FKs added in Phase 4 (inventory table otherwise locked).
- Payments and shipment carriers are Phase 5 / 6 (locked / ready).

---

## Phase 5 Payments (approved — locked)

```mermaid
erDiagram
  payment_gateways ||--o{ payment_methods : offers
  payment_gateways ||--o{ payments : processes
  payment_gateways ||--o{ payment_webhooks : delivers
  payment_gateways ||--o{ payment_settlements : settles
  payment_gateways ||--o{ emi_plans : emi
  orders ||--o{ payments : paid_by
  payments ||--o{ payment_attempts : retries
  payments ||--o{ payment_transactions : ledger
  payments ||--o{ refunds : refunds
  refunds ||--o{ refund_items : lines
  payments ||--o{ wallet_redemptions : wallet
  payments ||--o{ gift_card_redemptions : gift
  payment_settlements ||--o{ payment_reconciliation : lines
  payments ||--o{ payment_reconciliation : matched
  payments ||--o{ payment_disputes : disputes
  payments ||--o{ payment_audit_logs : audit

  payments {
    uuid id PK
    uuid order_id FK
    varchar gateway_order_id
    varchar gateway_payment_id
    payment_status status
    numeric amount
  }

  payment_webhooks {
    uuid id PK
    varchar idempotency_key
    webhook_processing_status processing_status
  }

  refunds {
    uuid id PK
    varchar refund_number UK
    refund_status status
  }
```

### Payments tables

| Table | Role |
|-------|------|
| `payment_gateways` / `payment_methods` | Razorpay + future gateways |
| `payments` | Order tenders (partial OK) |
| `payment_attempts` | Retries |
| `payment_transactions` | Auth/capture/refund ledger |
| `payment_webhooks` | Raw + idempotent processing |
| `payment_settlements` / `payment_reconciliation` | Bank settlement match |
| `refunds` / `refund_items` | Full/partial refunds |
| `wallet_redemptions` / `gift_card_redemptions` | Internal tender |
| `emi_plans` | Bank / no-cost EMI |
| `payment_disputes` | Chargebacks |
| `payment_audit_logs` | Status audit |
| `saved_payment_methods` | Gateway tokens only (no card data) |
| `settlement_batches` | Finance settlement batches |
| `merchant_accounts` | Marketplace payout accounts |
| `payment_events` | Replayable payment events |
| `exchange_rates` | FX rates |

### Design notes

- Multiple `payments` per order enable split tender and retries.
- Gateway secrets never stored in DB; saved methods store **tokens only**.
- Primary gateway seed: Razorpay.

---

## Phase 6 Shipping (approved — locked)

```mermaid
erDiagram
  orders ||--o{ shipments : ships
  warehouses ||--o{ shipments : fulfills_from
  fulfillment_orders ||--o{ shipments : may_link
  shipping_partners ||--o{ shipping_services : offers
  shipping_partners ||--o{ shipments : carries
  shipments ||--o{ shipment_packages : packs
  shipments ||--o{ shipment_items : lines
  shipments ||--o| shipment_tracking : current
  shipments ||--o{ tracking_events : history
  shipments ||--o{ shipment_labels : labels
  shipments ||--o{ delivery_attempts : attempts
  shipments ||--o{ delivery_proofs : pod
  shipments ||--o{ rto_shipments : rto
  orders ||--o{ reverse_shipments : reverse
  returns ||--o{ reverse_shipments : return_pickup
  pickup_schedules ||--o{ pickup_requests : slots
  pickup_requests ||--o{ shipments : batch_pickup
  shipping_rate_cards ||--o{ shipping_rates : slabs
  shipping_zones ||--o{ shipping_rates : from_to

  shipments {
    uuid id PK
    varchar shipment_number UK
    uuid warehouse_id FK
    varchar tracking_number
    varchar awb_number
    shipment_status status
  }

  shipment_packages {
    uuid id PK
    numeric weight_kg
    numeric volumetric_weight_kg
    numeric declared_value
  }

  shipment_tracking {
    uuid id PK
    uuid shipment_id UK
    shipment_status current_status
  }

  reverse_shipments {
    uuid id PK
    reverse_shipment_type reverse_type
    reverse_shipment_status status
  }

  rto_shipments {
    uuid id PK
    uuid forward_shipment_id FK
    rto_status status
  }
```

### Shipping tables

| Table | Role |
|-------|------|
| `shipping_partners` / `shipping_services` | Shiprocket + carriers |
| `shipping_zones` / `shipping_rate_cards` / `shipping_rates` | Rating |
| `shipping_rules` | Warehouse → carrier routing |
| `shipments` / `shipment_items` / `shipment_packages` | Split ship + packages |
| `awb_numbers` / `shipment_labels` | AWB pool + labels |
| `shipment_tracking` / `tracking_events` | Current + history |
| `pickup_schedules` / `pickup_requests` | Warehouse pickup |
| `delivery_attempts` / `delivery_proofs` | OFD + POD |
| `reverse_shipments` / `rto_shipments` | Returns / RTO |
| `shipping_webhooks` | Carrier webhooks |
| `carrier_sla` | Partner SLA metrics |
| `shipment_insurance` | High-value cover + claims |
| `delivery_slots` | Scheduled delivery windows |
| `pickup_points` | Stores / lockers |
| `shipping_cost_breakdown` | Fee line items |
| `delivery_failure_reasons` | Normalized OFD failures |
| `shipment_eta_history` | ETA change log |

### Design notes

- One order → many shipments; each shipment → one warehouse.
- Delivery exceptions live on `tracking_events` / `delivery_attempts` (+ normalized failure reasons).
- Primary partner seed: Shiprocket.

---

## Phase 7 Warranty & Service (approved — locked)

```mermaid
erDiagram
  warranty_providers ||--o{ warranty_plans : offers
  warranty_plans ||--o{ warranty_registrations : covers
  warranty_registrations ||--o{ warranty_claims : claims
  warranty_registrations ||--o{ warranty_extensions : extends
  warranty_claims ||--o{ service_tickets : opens
  service_centers ||--o{ service_center_locations : sites
  service_centers ||--o{ technicians : staffs
  technicians ||--o{ technician_skills : skills
  service_tickets ||--o{ ticket_status_history : history
  service_tickets ||--o{ diagnostic_reports : diagnose
  service_tickets ||--o{ repair_jobs : repairs
  repair_jobs ||--o{ repair_part_usage : uses
  repair_parts ||--o{ repair_part_usage : consumed
  service_tickets ||--o{ rma_requests : rma
  service_tickets ||--o{ replacement_requests : replace
  trade_in_requests ||--o{ trade_in_evaluations : evaluate
  serial_numbers ||--o{ warranty_registrations : registered

  warranty_registrations {
    uuid id PK
    varchar registration_number UK
    warranty_registration_status status
  }

  warranty_claims {
    uuid id PK
    varchar claim_number UK
    warranty_claim_status status
  }

  service_tickets {
    uuid id PK
    varchar ticket_number UK
    service_ticket_status status
    uuid technician_id FK
  }

  repair_jobs {
    uuid id PK
    varchar repair_number UK
    repair_outcome outcome
  }

  rma_requests {
    uuid id PK
    varchar rma_number UK
    rma_type rma_type
  }
```

### Warranty & service tables

| Table | Role |
|-------|------|
| `warranty_providers` / `warranty_plans` | OEM / extended / ADP / AMC |
| `warranty_registrations` / `warranty_extensions` | Coverage on serials |
| `warranty_claims` / `claim_documents` / `warranty_status_history` | Claims |
| `service_centers` / `service_center_locations` | Bench network |
| `technicians` / `technician_skills` | Assignment |
| `service_tickets` / `ticket_status_history` | Service workflow |
| `diagnostic_reports` / `repair_jobs` / `repair_parts` / `repair_part_usage` | Repair |
| `replacement_requests` / `replacement_items` | Swap / credit |
| `rma_requests` | DOA / repair / replace / refund |
| `trade_in_requests` / `trade_in_evaluations` | Buyback prep |
| `service_feedback` / `service_documents` / `service_audit_logs` | CX + audit |
| `service_contracts` / `contract_items` / `contract_renewals` | Enterprise AMC |
| `spare_part_suppliers` / `supplier_part_catalog` | Spare procurement |
| `technician_certifications` | Qualifications + expiry |
| `repair_metrics` | Turnaround analytics |
| `device_health_reports` | Component health |
| `service_sla` | Response/resolution SLAs |
| `loan_devices` / `loan_allocations` | Temporary replacements |

### Design notes

- Ticket workflow matches: created → … → closed.
- Spare usage links inventory + warehouse + optional serial + claim.
- Phase 8 Service Center is absorbed into Phase 7.

---

## Phase 8 Marketing / CMS (approved — locked)

```mermaid
erDiagram
  cms_pages ||--o{ cms_sections : sections
  homepage_layouts ||--o{ homepage_section_items : ordered
  banner_groups ||--o{ banners : contains
  collections ||--o{ collection_products : merchandises
  products ||--o{ collection_products : listed
  product_badges ||--o{ product_badge_assignments : applied
  blog_categories ||--o{ blogs : categorizes
  blogs ||--o{ blog_tag_map : tagged
  blog_tags ||--o{ blog_tag_map : used
  blogs ||--o{ blog_comments : comments
  customer_segments ||--o{ customer_segment_members : members
  loyalty_accounts ||--o{ loyalty_transactions : ledger
  search_keywords ||--o{ search_synonyms : expands
  referral_programs ||--o{ referral_rewards : awards

  cms_pages {
    uuid id PK
    varchar slug UK
    cms_page_status status
  }

  collections {
    uuid id PK
    varchar slug UK
  }

  blogs {
    uuid id PK
    varchar slug UK
    cms_page_status status
  }

  loyalty_accounts {
    uuid id PK
    uuid customer_id UK
    loyalty_tier tier
    int points_balance
  }

  seo_metadata {
    uuid id PK
    seo_entity_type entity_type
    varchar meta_title
  }
```

### Marketing tables

| Area | Tables |
|------|--------|
| CMS | `cms_pages`, `cms_sections`, `homepage_layouts`, `homepage_section_items` |
| Merch | `banners`, `banner_groups`, `collections`, `product_badges` |
| Content | blogs (+ cats/tags/comments), `buying_guides`, FAQs |
| Campaigns | newsletter, email/push/SMS, notification templates |
| Loyalty | accounts, txs, reward rules, referrals |
| Personalization | segments, recommendations, recently viewed |
| SEO / search | metadata, redirects, keywords, synonyms, popular, zero-result |
| Experimentation | A/B tests, feature flags |
| Attribution | channels, UTM campaigns, order attribution |
| SEO ops | health reports, broken links, missing metadata |
| Versioning | content versions, page revisions |

### Design notes

- Homepage builder = layout + ordered section items + `config_json`.
- Coupons stay in Phase 4; campaigns promote them.
- Next phase: Analytics.

---

## Phase 9 Analytics (approved / locked — v1.0)

```mermaid
erDiagram
  users ||--o{ audit_logs : performs
  users ||--o{ user_events : emits
  users ||--o{ customer_ltv : ltv
  search_logs ||--o{ search_clicks : clicks
  products ||--o{ product_views : viewed
  products ||--o{ product_performance : daily
  dashboard_layouts ||--o{ dashboard_widget_instances : places
  dashboard_widgets ||--o{ dashboard_widget_instances : rendered
  saved_reports ||--o{ scheduled_reports : schedules
  saved_reports ||--o{ report_exports : exports
  data_marts ||--o{ etl_jobs : runs
  etl_jobs ||--o{ warehouse_exports : produces
  metric_streams ||--o{ live_metrics : samples
  alert_rules ||--o{ alert_notifications : notifies
  alert_rules ||--o{ alert_history : fires
  ab_tests ||--o{ experiment_metrics : measures
  retention_policies ||--o{ archive_jobs : archives
  orders ||--o{ fraud_alerts : flags

  audit_logs {
    uuid id PK
    varchar entity_type
    varchar action
    timestamptz created_at
  }

  user_events {
    uuid id PK
    user_event_type event_type
    timestamptz created_at
  }

  sales_metrics {
    uuid id PK
    date metric_date
    analytics_period period
    numeric revenue
  }

  kpi_snapshots {
    uuid id PK
    varchar domain
    jsonb metrics_json
  }

  api_request_logs {
    uuid id PK
    smallint status_code
    int latency_ms
  }

  etl_jobs {
    uuid id PK
    etl_job_status status
  }

  live_metrics {
    uuid id PK
    numeric value
    timestamptz created_at
  }

  alert_rules {
    uuid id PK
    alert_severity severity
  }
```

### Analytics tables

| Area | Tables |
|------|--------|
| Audit | `audit_logs` (append-only), `activity_logs`, `system_events` |
| Behavior | user events, page/screen views, sessions |
| Funnel/search | search logs/clicks, conversions, cart abandonment, product views |
| KPIs | sales/inventory/payment/shipping/service/marketing metrics + snapshots |
| Campaigns | campaign_performance, email/push/sms statistics |
| BI | dashboards, saved/scheduled reports, exports |
| Monitoring | error, API, job, webhook logs |
| Warehouse *(optional)* | `data_marts`, `etl_jobs`, `warehouse_exports` |
| Real-time *(optional)* | `metric_streams`, `live_metrics` |
| Alerting *(optional)* | `alert_rules`, `alert_notifications`, `alert_history` |
| Experiments *(optional)* | `experiment_metrics` |
| LTV *(optional)* | `customer_ltv`, `cohort_analysis` |
| Fraud *(optional)* | `fraud_metrics`, `fraud_alerts` |
| Retention *(optional)* | `retention_policies`, `archive_jobs` |

### Design notes

- `audit_logs` has no update/delete path; `live_metrics` / `alert_history` are also append-style.
- Domain audit tables (payments/service) remain; global audit is cross-cutting.
- Optional extensions (`043`–`045`) reserve BI / streaming / governance without a Phase 10 module.
- Phase 9 completes the planned DB module sequence — **v1.0 locked**. Ready for backend implementation.

---

## Phase 2 Catalog (detail)

```mermaid
erDiagram
  media_files ||--o{ brands : logo
  media_files ||--o{ categories : icon_banner
  media_files ||--o{ product_images : file
  media_files ||--o{ product_media : file
  media_files ||--o{ product_documents : file
  media_files ||--o{ review_images : file

  brands ||--o{ products : manufactures
  categories ||--o{ categories : parent
  categories ||--o{ products : contains
  product_types ||--o{ products : classifies

  products ||--o{ product_variants : has
  products ||--o{ product_images : gallery
  products ||--o{ product_media : videos
  products ||--o{ product_documents : docs
  products ||--o{ product_specifications : specs
  products ||--o{ tag_map : tagged
  product_tags ||--o{ tag_map : used
  products ||--o{ product_reviews : reviews
  products ||--o{ featured_products : featured
  products ||--o{ compare_products : compared
  products ||--o{ related_products : related_from
  products ||--o{ related_products : related_to

  product_variants ||--o{ variant_attribute_values : attrs
  attributes ||--o{ attribute_values : values
  attribute_values ||--o{ variant_attribute_values : linked
  specification_groups ||--o{ product_specifications : groups
  product_reviews ||--o{ review_images : images
  users ||--o{ product_reviews : writes
  users ||--o{ compare_products : compares

  brands {
    uuid id PK
    varchar name
    varchar slug UK
    uuid logo_file_id FK
  }

  categories {
    uuid id PK
    uuid parent_id FK
    varchar name
    varchar slug UK
  }

  products {
    uuid id PK
    uuid brand_id FK
    uuid category_id FK
    uuid product_type_id FK
    varchar slug UK
    boolean is_refurbished
  }

  product_variants {
    uuid id PK
    uuid product_id FK
    varchar sku UK
    varchar barcode UK
    numeric sale_price
    product_condition condition
    int battery_health
  }

  attributes {
    uuid id PK
    varchar code UK
  }

  attribute_values {
    uuid id PK
    uuid attribute_id FK
    varchar value
  }
```

### Catalog tables

| Table | Role |
|-------|------|
| `media_files` | S3 object registry (no raw URLs on products) |
| `brands` | Brand master |
| `categories` | Nested tree (`parent_id`); subcategory = child |
| `product_types` | New / Refurbished / Open Box |
| `products` | Sellable product + SEO |
| `product_variants` | SKU-level config + facet columns |
| `product_images` / `product_media` / `product_documents` | Media links |
| `attributes` / `attribute_values` / `variant_attribute_values` | Dynamic EAV |
| `specification_groups` / `product_specifications` | PDP spec sheets |
| `product_tags` / `tag_map` | Marketing tags |
| `product_reviews` / `review_images` | Reviews |
| `compare_products` | Compare tray |
| `related_products` | Cross-sell / upsell / FBT |
| `featured_products` | Merchandising slots |

### Design notes

- **No separate `subcategory` table** — nesting via `categories.parent_id` (3NF, Amazon-style).
- Variant **facet columns** (RAM, CPU, …) are indexed for PLP filters; EAV covers long-tail attrs.
- `rating_avg` / `review_count` on `products` are **maintained caches** for sort/search (updated by app/trigger).

---

## Phase 1 Authentication (reference)

```mermaid
erDiagram
  users ||--o{ user_roles : has
  roles ||--o{ user_roles : assigned
  roles ||--o{ role_permissions : grants
  permissions ||--o{ role_permissions : granted_by
  users ||--o{ refresh_tokens : issues
  users ||--o{ sessions : opens
  users ||--o{ otps : receives
  users ||--o{ oauth_accounts : links
  users ||--o{ login_attempts : attempts
```
