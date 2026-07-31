# Rule Examples

## Promotion eligibility

```ts
ruleEngine.evaluate(
  {
    all: [
      { field: 'cart.total', gte: 5000 },
      { field: 'customer.tier', in: ['gold', 'platinum'] },
    ],
  },
  facts,
);
```

## Feature flag targeting

```ts
ruleEngine.evaluate(
  {
    any: [
      { field: 'customer.id', in: ['beta-user-1'] },
      { field: 'customer.tier', eq: 'platinum' },
    ],
  },
  facts,
);
```

## Shipping zone

```ts
ruleEngine.evaluate(
  { field: 'shipment.zone', eq: 'west' },
  facts,
);
```

## With actions (discount tag)

```ts
ruleEngine.evaluate(
  { field: 'cart.total', gte: 1000 },
  facts,
  {
    actions: [
      { op: 'percent', path: 'cart.total', value: -10 },
      { op: 'append_tag', path: 'customer.tags', value: 'summer10' },
    ],
  },
);
```
