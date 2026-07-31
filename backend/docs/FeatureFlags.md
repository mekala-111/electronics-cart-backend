# Feature Flags

`FeatureFlag` + `FeatureFlagRule.conditions_json` → `RuleEngine.evaluate`.  
Statuses: `enabled` / `disabled` / `conditional` (+ optional rollout %).  
Event: `feature_flag.evaluated`.
