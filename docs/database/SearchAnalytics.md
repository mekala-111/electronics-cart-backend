# Search Analytics — Electronics Cart

## Autocomplete

`search_keywords` (`is_autocomplete`, `boost`) + `search_synonyms` expand queries (e.g. `macbook air` ↔ `mba m2`).

## Popular & trending

`popular_searches` aggregates `search_count` + `last_searched_at` for trending rails.

## Zero results

`zero_result_searches` captures misses for merchandising / synonym fixes.

## Recently viewed

`recently_viewed_products` keyed by `customer_id` and/or anonymous `session_id`.

## Recommendations

`product_recommendations` links product → recommended product with `source` + optional `score` (manual or model-generated).

## Feedback loop

Track `recommendation_impressions` → `recommendation_clicks` and explicit `recommendation_feedback` (`relevant` / `not_relevant` / etc.) to retrain or reweight sources.
