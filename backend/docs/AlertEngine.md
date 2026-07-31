# Alert Engine

`alert_rules.condition_json` is a RuleEngine condition tree. Evaluation uses **only** `RuleEngine.evaluate` — no custom evaluator.

Examples:

```json
{ "field": "revenue.deltaPct", "lt": -10 }
{ "field": "inventory.lowStock", "gt": 50 }
{ "field": "payments.failed", "gte": 20 }
```

Cooldown uses `cooldown_minutes` + latest `alert_history.triggered_at`. Matches write `alert_history` and emit `analytics.alert.triggered`.
