# Search Strategy

## Goals

Support Best Buy / Dell-style PLP filters at millions of SKUs:

- Keyword (name, brand, specs text)
- Facets: brand, category, processor, GPU, RAM, storage, condition, battery health, price, rating
- Sort: relevance, price, rating, newest
- SEO-friendly slug URLs

## Layered approach

| Layer | Technology | Use |
|-------|------------|-----|
| 1 | PostgreSQL B-tree + GIN FTS | MVP / admin / fallback |
| 2 | Redis facet cache | Hot category filter counts |
| 3 | OpenSearch / Typesense (future) | Typo tolerance, ranking at scale |

Phase 2 delivers **Layer 1** schema + indexes. Layer 3 is additive (sync workers), no schema rewrite.

## PostgreSQL query patterns

### Keyword

```sql
SELECT p.*
FROM products p
WHERE p.deleted_at IS NULL AND p.status = 'active'
  AND to_tsvector('english', coalesce(p.name,'') || ' ' || coalesce(p.short_description,''))
      @@ plainto_tsquery('english', $q)
ORDER BY ts_rank(
  to_tsvector('english', coalesce(p.name,'') || ' ' || coalesce(p.short_description,'')),
  plainto_tsquery('english', $q)
) DESC;
```

### Facets (variant columns)

Filter on indexed `product_variants` columns, then `DISTINCT ON (product_id)` or `GROUP BY product_id` for one card per product (min sale_price).

```sql
SELECT p.id, p.name, p.slug, p.rating_avg,
       MIN(v.sale_price) AS from_price
FROM products p
JOIN product_variants v ON v.product_id = p.id
  AND v.deleted_at IS NULL AND v.status = 'active'
WHERE p.deleted_at IS NULL AND p.status = 'active'
  AND ($brand::uuid IS NULL OR p.brand_id = $brand)
  AND ($cat::uuid IS NULL OR p.category_id = ANY($cat_ids))
  AND ($cond::product_condition IS NULL OR v.condition = $cond)
  AND ($ram::text IS NULL OR v.ram = $ram)
  AND ($storage::text IS NULL OR v.storage = $storage)
  AND ($cpu::text IS NULL OR v.processor ILIKE $cpu)
  AND ($gpu::text IS NULL OR v.gpu ILIKE $gpu)
  AND ($min::numeric IS NULL OR v.sale_price >= $min)
  AND ($max::numeric IS NULL OR v.sale_price <= $max)
  AND ($bh::int IS NULL OR v.battery_health >= $bh)
GROUP BY p.id
ORDER BY from_price ASC
LIMIT $limit OFFSET $offset;
```

### Dynamic EAV facets

For long-tail attributes not denormalized on variants:

```sql
JOIN variant_attribute_values vav ON vav.variant_id = v.id AND vav.deleted_at IS NULL
JOIN attribute_values av ON av.id = vav.attribute_value_id
JOIN attributes a ON a.id = av.attribute_id AND a.code = 'fingerprint'
WHERE av.slug = 'yes';
```

Prefer denormalized facet columns for top 10 filters (already on `product_variants`).

### Category tree

Use recursive CTE (see DatabaseFlow.md) then `category_id = ANY(tree_ids)`.

## Redis (recommended)

- Key: `facet:{categoryId}:{filterHash}` → JSON counts, TTL 60–300s
- Invalidate on product/variant publish webhook

## Future OpenSearch mapping (preview)

```
product_id, slug, name, brand_slug, category_path[],
ram, storage, processor, gpu, condition, battery_health,
sale_price_min, rating_avg, is_refurbished, is_featured
```

Synced from Postgres via outbox / Debezium in a later ops phase.

## SEO

| Field | Table |
|-------|-------|
| slug | products (unique live) |
| seo_title / seo_description / meta_keywords / canonical_url | products |
| brand + category slugs | URL path composition in app |
