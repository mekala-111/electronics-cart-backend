# Product Lifecycle

1. **Create product** — requires existing `brandId`, `categoryId`, `productTypeId`; unique active `slug` (lock `catalog:product-slug:{slug}`)
2. **Create variants** — unique active `sku` (lock `catalog:sku:{sku}`); optional `attributeValueIds`
3. **Attach media / specs / badges / SEO**
4. **Publish** — `status = active` (default); storefront lists only active non-deleted
5. **Update** — emits `ProductUpdated`; cache bust for id + slug + list keys
6. **Delete** — soft-delete (`deleted_at`, `status = archived`); emits `ProductDeleted`

Flags: `is_featured`, `is_refurbished`, `is_open_box`, `is_new_arrival` drive curated list endpoints.
