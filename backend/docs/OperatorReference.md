# Operator Reference

| Operator | Expected | Behavior |
|---|---|---|
| `eq` / `neq` | any | Deep/primitive equality (dates by epoch) |
| `gt` `gte` `lt` `lte` | number / date / string | Ordered compare |
| `between` | `[min, max]` | Inclusive |
| `in` | array | Membership |
| `contains` | any | String includes **or** array membership |
| `starts_with` / `ends_with` | string | String prefix/suffix |
| `matches_regex` | string | `RegExp` test (pattern ≤ 256) |
| `exists` | bool (default true) | Present / absent |
| `is_true` / `is_false` | ignored | Strict boolean |
| `is_null` / `is_not_null` | ignored | null or undefined |

Operators live in `OperatorRegistry` and are independently unit-tested.

## Deterministic actions (optional)

Applied only when `matched` and `options.actions` provided. Output in `metadata.actionOutput` (facts never mutated).

| op | Effect |
|---|---|
| `set` | Set path |
| `add` | Numeric += |
| `multiply` | Numeric *= |
| `percent` | `value * (1 + p/100)` |
| `append_tag` | Push string onto array |
