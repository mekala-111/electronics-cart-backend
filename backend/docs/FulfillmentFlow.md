# Fulfillment Flow

Admin `POST /api/admin/orders/:id/fulfillments`:

1. Order must be `confirmed|processing|packed`
2. Creates `fulfillment_orders` + items + open pick/pack lists
3. Transitions order `confirmed` → `processing`
4. Emits `order.fulfillment_created`

Status updates: `PATCH /api/admin/orders/fulfillments/:id/status`
Invoices: `POST /api/admin/orders/:id/invoices`
