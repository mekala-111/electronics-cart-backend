# Coding Standards

- TypeScript strict; prefer explicit return types on public service methods.
- One module = one domain; inject repositories into services, not Prisma into controllers.
- DTOs use `class-validator` / `class-transformer`; never trust raw body.
- Errors throw `AppException` with stable `code` strings from `ErrorCodes`.
- No business logic in controllers.
- Do not edit `../database/schema.prisma` or SQL migrations from the backend package.
- Prefer pure utils in `common/utils` over ad-hoc helpers.
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
