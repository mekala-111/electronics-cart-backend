# Rule Engine

Shared pure evaluator: `backend/src/shared/rules/`.

## Purpose

Evaluate a **condition tree** against an immutable **facts** object and return a `RuleResult`. Domain modules own storage (`conditions_json`, etc.) and call:

```ts
ruleEngine.evaluate(conditions, facts, options?)
```

## Non-goals

No Prisma, Redis, BullMQ, controllers, repositories, APIs, or domain knowledge (coupons / flags / shipping / marketing).

## Components

| File | Role |
|---|---|
| `RuleEngine` | Public API + optional deterministic actions |
| `ConditionEvaluator` | `all` / `any` / `not` + short-circuit |
| `OperatorRegistry` | Pluggable leaf operators |
| DSL validator | Malformed tree → `errors[]` (no throw) |

## Sequence

```mermaid
sequenceDiagram
  participant Domain
  participant RuleEngine
  participant ConditionEvaluator
  participant OperatorRegistry

  Domain->>RuleEngine: evaluate(conditions, facts)
  RuleEngine->>RuleEngine: freeze facts
  RuleEngine->>ConditionEvaluator: evaluate
  ConditionEvaluator->>ConditionEvaluator: validate DSL
  loop each leaf
    ConditionEvaluator->>OperatorRegistry: get(op)
    OperatorRegistry-->>ConditionEvaluator: operator
    ConditionEvaluator->>ConditionEvaluator: resolve path (cached)
  end
  ConditionEvaluator-->>RuleEngine: matched, score, reasons, errors
  opt matched and actions
    RuleEngine->>RuleEngine: applyActions(copy)
  end
  RuleEngine-->>Domain: RuleResult
```

## Security

No `eval`, `Function`, `vm`, dynamic imports, or third-party rule engines. Regex patterns capped at 256 chars.

## Wiring

`RulesModule` is `@Global()` and imported from `AppModule`. Inject `RuleEngine`.
