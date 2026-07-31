# Database Flows

## Phase 1 — Authentication (approved)

See prior flows: password login, refresh rotation, OTP, OAuth, RBAC soft-delete.

---

## Phase 2 — Catalog

### Create product (admin)

```
1. Ensure brand, category, product_type exist (or create)
2. INSERT products (slug unique among live rows)
3. INSERT product_variants (sku/barcode unique)
4. Optionally:
   - product_images / product_media / product_documents → media_files
   - product_specifications → specification_groups
   - variant_attribute_values → attribute_values
   - tag_map → product_tags
5. If merchandised: featured_products / related_products
```

### Storefront PLP filter

```
products (status=active, deleted_at IS NULL)
  JOIN product_variants v ON v.product_id = products.id
       AND v.status = active AND v.deleted_at IS NULL
WHERE brand_id = ?
  AND category_id IN (category + descendants)   -- recursive CTE
  AND v.condition = ?
  AND v.ram = ?
  AND v.storage = ?
  AND v.processor ILIKE ?
  AND v.sale_price BETWEEN ? AND ?
  AND (?::int IS NULL OR v.battery_health >= ?)
ORDER BY products.rating_avg DESC | v.sale_price | products.created_at
```

Category descendants:

```sql
WITH RECURSIVE tree AS (
  SELECT id FROM categories WHERE id = $1 AND deleted_at IS NULL
  UNION ALL
  SELECT c.id FROM categories c
  JOIN tree t ON c.parent_id = t.id
  WHERE c.deleted_at IS NULL
)
SELECT id FROM tree;
```

### PDP load

```
product by slug
  + brand, category, product_type
  + variants (sorted by sale_price)
  + images (is_primary first)
  + specifications grouped by specification_groups.sort_order
  + related_products by relation_type
  + reviews (status=active) with review_images
```

### Review publish

```
INSERT product_reviews (status=pending)
Admin approves → status=active
Recalc products.rating_avg / review_count
  (AVG(rating), COUNT(*) WHERE status=active AND deleted_at IS NULL)
```

### Compare tray

```
Guest: compare_products.session_key
User:  compare_products.user_id
Max N products; join variants for attribute matrix (is_comparable attributes)
```

---

## Phase 3 — Inventory

Detailed steps: [`InventoryFlow.md`](./InventoryFlow.md) · warehouse topology: [`WarehouseArchitecture.md`](./WarehouseArchitecture.md).

### Availability for PDP / cart

```
SELECT COALESCE(SUM(available_quantity), 0)
FROM inventory
WHERE variant_id = $1
  AND deleted_at IS NULL
  AND status = 'active';
-- Optional: filter warehouse_id for local fulfillment
```

### Future (Phase 5+)

```
Orders → payments / refunds
Orders → shipments / tracking
Returns → payment refunds + inventory return_to_stock
```
