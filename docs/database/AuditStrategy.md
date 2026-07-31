# Audit Strategy — Electronics Cart

## Global `audit_logs` (append-only)

Capture every sensitive mutation:

| Field | Purpose |
|-------|---------|
| `entity_type` / `entity_id` | Target record |
| `action` | create / update / delete / status_changed / … |
| `previous_values` / `new_values` | JSON diffs |
| `performed_by` | Actor user |
| `role_code` | Role at time of action |
| `ip_address` / `device` | Client context |
| `request_id` | Correlate with `api_request_logs` |
| `created_at` | Immutable timestamp |

**Rules**

- No `UPDATE` / soft-delete on `audit_logs`
- No `updated_at` column
- Writes only from trusted app services / middleware
- Retain per compliance policy (partition by `created_at` when volume grows)

## Companion tables

- `activity_logs` — lighter user/system activity trail
- `system_events` — infra/business signals without entity diffs
