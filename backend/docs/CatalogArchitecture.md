# Catalog Architecture

Product Catalog module: `backend/src/modules/catalog`.

## Boundaries

- **Public** `/api/catalog/*` — `@Public()`, Redis-cached reads
- **Admin** `/api/admin/catalog/*` — roles `admin|super_admin` + permission `catalog.write` (reads use `catalog.read` where noted)
- Admin creates use `@Idempotent()` + `LockService` for slug/SKU races
- **No schema changes** — locked DB v1.0 only

## Tables used

`brands`, `categories`, `products`, `product_variants`, `variant_attribute_values`, `attributes`, `attribute_values`, `product_specifications`, `product_media`, `media_files`, `collections`, `collection_products`, `product_badges`, `product_badge_assignments`, `buying_guides`, `seo_metadata`, `search_keywords`, `search_synonyms`

## Schema gaps (documented, not invented)

| Requested | Reality in v1.0 |
| --- | --- |
| `category_closure` | Tree via `categories.parent_id` (adjacency list) |
| `product_videos` | `product_media` + `media_files.kind = video` |
| `product_questions` | **Not present** — GET returns `[]` |
| `variant_attributes` | `variant_attribute_values` |

## Cache

Redis keys under `catalog:*` (TTL 300s). Invalidated on admin writes via `CatalogCacheService`.

## Events

`BrandCreated`, `CategoryCreated`, `ProductCreated`, `VariantCreated`, `ProductUpdated`, `ProductDeleted` (Nest EventEmitter).

## Product identity

`GET /api/catalog/products/:idOrSlug` accepts UUID **or** slug (same handler).
