# Checkout Flow — Electronics Cart

## Actors

- **Guest** — `carts.session_key`, no `user_id`
- **Customer** — `carts.user_id`

## Cart lifecycle

```
guest cart (session_key)
  → login / register
  → merge into user cart (merged_into_id, status=merged)
  → active user cart persists across devices
```

`cart_items` hold live `unit_price` (refreshable). `saved_for_later` parks SKUs without holding stock.

## Reservation

On approaching checkout (or add-to-cart for scarce SKUs):

1. Choose fulfillment warehouse (nearest with stock)
2. Insert `stock_reservations` (`cart_id`, `expires_at`, `status=active`)
3. Decrement `inventory.available_quantity`, increment `reserved_quantity`
4. Expiry job releases holds (see InventoryFlow)

## Checkout steps

```
1. Review cart + shipping address
2. Apply coupon code → validate rules
   - flat | percentage
   - brand / category scope via coupon_rules
   - min_cart_value, max_discount
   - usage_limit / per_user_limit / expires_at
3. Compute:
   subtotal − discount + GST + shipping_charge = grand_total
4. Place order (OrderFlow)
5. Redirect to payment (Phase 5)
```

## Coupon evaluation (app)

```
eligible lines = cart lines matching brand/category rules (or all if no scope rules)
discount = flat OR percent(eligible)
discount = min(discount, max_discount) if set
reject if subtotal < min_cart_value
reject if usage_limit or per_user_limit exceeded
```

## Wishlist

Independent of cart: `wishlists` → `wishlist_items`. Move-to-cart copies into `cart_items` and optionally creates a reservation.
