# SEO Architecture — Electronics Cart

## Metadata

`seo_metadata` is entity-scoped:

- `entity_type` + optional `entity_id` (product, category, collection, blog, …)
- `slug`, `meta_title`, `meta_description`, `canonical_url`
- Open Graph: `og_title`, `og_description`, `og_image_file_id` → `media_files`
- `structured_data` JSONB (JSON-LD payload reference)

## Redirects

`seo_redirects`: `from_path` → `to_path` with `http_status` (301/302/307/308).

App middleware loads active redirects before route resolution.

## Health monitoring

Nightly (or on-demand) jobs write `seo_health_reports`, then `broken_links` and `missing_metadata` issue rows for ops.
