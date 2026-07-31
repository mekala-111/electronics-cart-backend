# Returns & Exchanges

- Return: order status in `shipped|delivered|completed`; creates `returns` + `return_items`; event `order.return_requested`
- Exchange: creates `exchange_requests` (schema has no `exchanges`/`exchange_items`); event `order.exchange_requested`
- Cancel: only from `pending|confirmed`; releases active stock reservations; event `order.cancelled`
