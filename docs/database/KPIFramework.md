# KPI Framework — Electronics Cart

## Periods

`analytics_period`: `daily` | `weekly` | `monthly` on metric tables and `kpi_snapshots`.

## Domain tables

| Domain | Table | Core measures |
|--------|-------|---------------|
| Sales | `sales_metrics` | orders, revenue, refunds, AOV |
| Inventory | `inventory_metrics` | on-hand, reserved, low-stock, stockouts |
| Payments | `payment_metrics` | captured, failed, refunded, success_rate |
| Shipping | `shipping_metrics` | shipments, delivered, RTO, avg days |
| Service | `service_metrics` | opened/closed tickets, turnaround, SLA breaches |
| Marketing | `marketing_metrics` | sessions, new customers, email sends, attributed revenue |

## Cross-domain snapshots

`kpi_snapshots(domain, period, metric_date, metrics_json)` packs executive views: sales, revenue, orders, refunds, inventory, payments, shipping, warranty/service, marketing, customer growth, retention.

## Product grain

`product_performance` + `product_views` + `wishlist_analytics` for merchandising KPIs.
