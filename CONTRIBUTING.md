# Contributing

## Scope

This repository hosts the Electronics Cart NestJS API and locked PostgreSQL v1.0 schema.

## Rules

1. Do not edit locked SQL `database/sql/001`–`045` DDL in place. Additive work uses `046+` after approval.
2. Do not commit secrets (`.env*`, keys, dumps).
3. Backend changes must pass `pnpm lint`, `pnpm test`, and `pnpm run build`.
4. Database changes must pass `database` `npm run verify` (or CI `database-verification`).
5. Production deploys must never apply demo seeds (`APPLY_DEMO_DATA=0`).

## Pull requests

- Keep PRs focused (one concern).
- Update docs under `backend/docs/` when changing deploy/migrate/safety behaviour.
- Wait for CODEOWNERS review on `backend/` and `database/`.
