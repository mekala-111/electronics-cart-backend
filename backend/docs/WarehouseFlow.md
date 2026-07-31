# Warehouse Flow

Locations: **warehouse → zone → rack → bin**. Inventory is unique on `(bin_id, variant_id)`.

Public:
- `GET /api/inventory/warehouses`
- `GET /api/inventory/warehouses/:id` (nested locations)
- `GET /api/inventory/warehouse-availability?variantId=`

Admin:
- CRUD warehouses
- `POST /api/admin/inventory/locations` creates zone/rack/bin as needed
