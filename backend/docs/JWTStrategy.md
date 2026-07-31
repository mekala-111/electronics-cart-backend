# JWT Strategy

## Access tokens

Signed by `JwtService` from `CoreAuthModule` using `jwt.secret` and `jwt.accessExpiresIn` (default `15m`).

### Payload (`AuthUser` / `JwtPayload`)

| Claim | Description |
| --- | --- |
| `sub` | User UUID |
| `email` | Optional email |
| `mobile` | Optional mobile |
| `roles` | Role codes from `user_roles` |
| `permissions` | Permission codes via role joins |
| `sessionId` | Active session UUID |
| `tokenFamilyId` | Refresh token family UUID |

## Refresh tokens

- Opaque random tokens (64 hex chars) stored hashed (SHA-256) in `refresh_tokens`.
- TTL: `REFRESH_DAYS` (7 days).
- Rotation on `/auth/refresh`; reused rotated/revoked tokens trigger family revocation (`AUTH_TOKEN_REUSED`).

## Guard behavior

`JwtAuthGuard` (global) verifies Bearer access tokens and maps `sessionId` and `tokenFamilyId` onto `request.user`. Routes marked `@Public()` skip verification.

## Configuration

Environment variables (via `config/jwt.config.ts`):

- `JWT_SECRET`
- `JWT_REFRESH_SECRET` (reserved for future HMAC refresh validation if needed)
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
