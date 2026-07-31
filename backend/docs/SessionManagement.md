# Session Management

## Session records

Each successful login or registration creates a row in `sessions` with:

- Hashed session token (`session_token_hash`)
- Device name/type parsed from User-Agent
- IP address and User-Agent
- `expires_at` — `SESSION_DAYS` (7 days)
- `status` — `active` until revoked or expired

## API

| Method | Route | Description |
| --- | --- | --- |
| GET | `/auth/sessions` | List active sessions; marks current via JWT `sessionId` |
| DELETE | `/auth/sessions/:id` | Revoke one session |
| DELETE | `/auth/sessions` | Revoke all except current session |

## Logout

`POST /auth/logout` optionally revokes the refresh token and/or session from the JWT.

## Password change

Changing password revokes all refresh tokens and sessions except an optional `keepSessionId`.

## Refresh tokens

Sessions and refresh tokens are independent but linked through the access JWT (`sessionId` + `tokenFamilyId`).
