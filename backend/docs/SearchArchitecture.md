# Search Architecture

Endpoint: `GET /api/catalog/products/search` (also `GET /api/catalog/products`).

## Filters

| Query | Behavior |
| --- | --- |
| `q` | ILIKE on name, descriptions, slug, brand name, SKU; expanded via `search_synonyms` |
| `brandId` / `brandSlug` | Brand filter |
| `categoryId` / `categorySlug` | Category filter |
| `collectionId` / `collectionSlug` | Via `collection_products` |
| `minPrice` / `maxPrice` | Variant `sale_price` |
| `condition` | `ProductCondition` |
| `availability` | `StockStatus` |
| `attributes` | Comma-separated `attribute_value` ids |
| `minRating` | `products.rating_avg` |
| `featured` / `refurbished` / `newArrival` | Boolean flags |
| `sort` | `price_asc`, `price_desc`, `newest`, `rating`, `name` |
| `page` / `limit` | Pagination (max 100) |

## Caching

Filter set hashed → `catalog:products:list:{hash}`.

## Future

OpenSearch / dedicated search index when catalog volume requires it. Current path is Prisma + Postgres indexes from phase-2 SQL.
