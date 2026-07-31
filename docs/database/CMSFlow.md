# CMS Flow — Electronics Cart

## Pages & sections

1. Create `cms_pages` (`slug`, `page_type`, `status`)
2. Attach reusable `cms_sections` with `section_type` + `config_json` + `sort_order` (drag-and-drop order)
3. Publish → `status = published`, set `published_at`

## Homepage layouts

Multiple `homepage_layouts` (one `is_default`). Each layout owns ordered `homepage_section_items` (banner group, collection, badges, blog rail, etc.).

App resolves default layout → render sections by `sort_order` → hydrate from `config_json` (e.g. `group_code`, `collection_slug`).

## Landing templates

Reusable campaign shells: `landing_templates` + ordered `landing_template_sections` (clone into `cms_pages` for a live campaign).

## Versioning

`page_revisions` (CMS page snapshots) + generic `content_versions` for draft/publish/rollback.

## Banners & collections

- `banner_groups` + `banners` (schedule via `starts_at` / `ends_at`)
- `collections` (manual product list or `is_automatic` + `rules_json`)
- `product_badges` assigned via `product_badge_assignments`
