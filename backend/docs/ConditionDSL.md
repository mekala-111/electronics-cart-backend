# Condition DSL

## Logical nodes

```json
{ "all": [ /* ConditionNode[] */ ] }
{ "any": [ /* ConditionNode[] */ ] }
{ "not": /* ConditionNode */ }
```

- `all([])` → true  
- `any([])` → false  
- `null` / `undefined` conditions → match (no restriction)

## Leaf nodes

Exactly one operator key plus `field`:

```json
{ "field": "cart.total", "gte": 5000 }
```

## Full example

```json
{
  "all": [
    { "field": "cart.total", "gte": 5000 },
    { "field": "customer.tier", "eq": "gold" },
    {
      "any": [
        { "field": "payment.method", "eq": "upi" },
        { "field": "payment.method", "eq": "card" }
      ]
    }
  ]
}
```

## Field paths

Dotted paths: `customer.tier`, `cart.total`. Invalid characters → structured error. Missing paths resolve to `undefined` (leaf usually fails to match).

## Short-circuit

- `all`: stop on first false  
- `any`: stop on first true  

Disable with `options.shortCircuit: false`.
