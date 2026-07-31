# Rate Calculation

Uses `shipping_zones` + `shipping_rate_cards` + `shipping_rates`.

```
billable = max(weightKg, min_weight_kg)
total = base_rate + per_kg_rate * max(0, billable - min_weight_kg)
      + COD fee (optional) + insurance (optional % of declared)
```

Zone match: `pincode_from ≤ pincode ≤ pincode_to`.

APIs: `GET /api/shipping/rates`, `POST /api/shipping/estimate`.
