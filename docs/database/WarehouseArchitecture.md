# Warehouse Architecture — Electronics Cart

## Location hierarchy

```
warehouse
  └─ zone
       └─ rack
            └─ bin
                 └─ inventory  (bin × variant)
```

Stock lives on the **bin**. `warehouse_id` is denormalized on `inventory` / `serial_numbers` / `inventory_batches` for warehouse-level sums.

## Capacity

`warehouse_capacity` — one row per warehouse (`maximum_units`, `occupied_units`).

## Seed path (HYD)

`HYD-01` → `ZONE-A` → `R01` → `B01` → MacBook inventory / batch  
Refurb: `ZONE-R` → `R01` → `B01`
