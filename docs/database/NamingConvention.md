# Naming Convention

## Tables
- **snake_case**, **plural**: `users`, `refresh_tokens`, `role_permissions`
- Never camelCase or singular table names

## Columns
- **snake_case**: `created_at`, `password_hash`, `user_id`
- Boolean: `is_system`, `mfa_enabled`, `success`
- Timestamps: `*_at` with `TIMESTAMPTZ`
- Foreign keys: `{table_singular}_id` → `user_id`, `role_id`

## Primary keys
- Column name: `id`
- Type: `UUID` (`gen_random_uuid()`)
- Public APIs expose the same UUID (no separate `uuid` column — avoids duplication)

## Audit columns (every table)
| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID PK | |
| `created_at` | TIMESTAMPTZ | NOT NULL, default NOW() |
| `updated_at` | TIMESTAMPTZ | trigger-maintained |
| `deleted_at` | TIMESTAMPTZ | soft delete; NULL = live |
| `created_by` | UUID → users | nullable for bootstrap |
| `updated_by` | UUID → users | nullable |
| `status` | enum / record_status | domain-specific where needed |

## Soft delete
- Never hard-delete business rows in app code
- Unique business keys are **partial**: `WHERE deleted_at IS NULL`
- Queries default-filter `deleted_at IS NULL` (Prisma middleware / repository)

## Enums
- PostgreSQL enums in `snake_case` values: `active`, `reset_password`
- Prisma enums use the same string values

## Indexes
- Prefix: `idx_{table}_{cols}`
- Unique: `uq_{table}_{cols}`
- Partial unique preferred for soft-delete tables

## Prisma models
- **Singular** PascalCase: `User`, `RefreshToken`
- `@@map("plural_snake")` to SQL tables
