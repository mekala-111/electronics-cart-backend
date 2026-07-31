# Index Strategy

## Principles

1. **Partial indexes** on `deleted_at IS NULL` for live-row lookups.
2. **Unique business keys** (slug, sku, barcode, codes) are partial-unique.
3. **Facet columns** on `product_variants` are B-tree indexed for PLP filters.
4. **GIN FTS** on product name + short_description for keyword search.
5. Avoid indexing low-selectivity booleans alone unless filtered (`is_featured = TRUE`).

## Phase 1 (Auth) — summary

| Index | Purpose |
|-------|---------|
| `uq_users_email_active` / `uq_users_mobile_active` | Login identity |
| `uq_refresh_tokens_token_hash` | Token lookup |
| `idx_login_attempts_*` | Rate limit / fraud |

## Phase 2 (Catalog) — critical indexes

### Identity & SEO

| Index | Table | Columns |
|-------|-------|---------|
| `uq_brands_slug_active` | brands | slug |
| `uq_categories_slug_active` | categories | slug |
| `uq_products_slug_active` | products | slug |
| `uq_product_variants_sku_active` | product_variants | sku |
| `uq_product_variants_barcode_active` | product_variants | barcode |

### Foreign keys / joins

| Index | Columns |
|-------|---------|
| `idx_products_brand_id` | brand_id |
| `idx_products_category_id` | category_id |
| `idx_products_product_type_id` | product_type_id |
| `idx_product_variants_product_id` | product_id |
| `idx_categories_parent_id` | parent_id |

### Merchandising & status

| Index | Filter |
|-------|--------|
| `idx_products_is_featured` | featured = true |
| `idx_products_is_refurbished` | refurbished = true |
| `idx_products_status` | status |
| `idx_featured_products_slot_sort` | slot + sort_order |

### Faceted search (variant)

| Index | Column |
|-------|--------|
| `idx_product_variants_sale_price` | sale_price |
| `idx_product_variants_condition` | condition |
| `idx_product_variants_battery_health` | battery_health |
| `idx_product_variants_processor` | processor |
| `idx_product_variants_gpu` | gpu |
| `idx_product_variants_ram` | ram |
| `idx_product_variants_storage` | storage |
| `idx_product_variants_filter_bundle` | product_id, condition, ram, storage, sale_price |

### Full-text

| Index | Definition |
|-------|------------|
| `idx_products_fts` | GIN `to_tsvector(name \|\| short_description)` |

## Phase 3 (Inventory) — critical indexes

| Index | Purpose |
|-------|---------|
| `uq_warehouses_code_active` | Warehouse code |
| `uq_inventory_bin_variant_active` | One stock row per bin × variant |
| `idx_inventory_warehouse_variant` | Warehouse availability rollups |
| `idx_inventory_low_stock` | Reorder scan (`available <= reorder`) |
| `uq_serial_numbers_serial_active` / `imei` / `barcode` | Unit identity |
| `uq_purchase_orders_po_number_active` | PO lookup |
| `idx_stock_reservations_expires_at` | Expiry worker (active only) |
| `idx_inventory_movements_wh_time` / `variant_time` | Ledger queries |
| `idx_low_stock_alerts_status` | Open alerts |

## Maintenance

- After bulk imports: `ANALYZE products; ANALYZE product_variants; ANALYZE inventory;`
- Monitor bloat on high-churn tables (`product_reviews`, `compare_products`, `inventory_movements`, `stock_reservations`).
- Reservation expiry job should use `idx_stock_reservations_expires_at`.
