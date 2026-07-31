# Authentication Architecture

## Overview

The domain auth module lives at `src/modules/auth/` and orchestrates identity, credentials, sessions, refresh tokens, OTP, and audit logging. JWT signing and guards are provided by `CoreAuthModule` at `src/core/auth/core-auth.module.ts`.

## Components

| Layer | Responsibility |
| --- | --- |
| Controller | HTTP routes under `/auth` |
| AuthService | Registration, login, refresh rotation, profile, password, OTP |
| Repositories | Prisma access with soft-delete filters |
| TokenService | Access JWT + refresh token persistence |
| SessionService | Device session records |
| OtpService | Hashed OTP lifecycle |
| AuditService | Append-only `audit_logs` writes |
| AuthMailService | Email queue with synchronous fallback |

## Data models (Prisma only)

Uses: `User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `Session`, `RefreshToken`, `LoginAttempt`, `Otp`, `OauthAccount`, `AuditLog`.

## Schema constraints handled in code

- **No profile name/avatar/timezone/language on `User`** — `UpdateProfileDto` only updates `mobile`.
- **Login identifier** — email OR mobile; no username column.
- **No password history table** — password changes overwrite `password_hash` and revoke tokens/sessions.
- **Customer role seed** — assigned via fixed `CUSTOMER_ROLE_ID` on register.

## Events

`EventEmitterModule` publishes domain events such as `auth.user.registered` and `auth.user.logged_in` through `AuthEventPublisher`.

## Security controls

- Argon2id password hashing
- Refresh token rotation with reuse detection (family revocation)
- Account lockout after 5 failed logins for 30 minutes
- OTP stored as SHA-256 hash with attempt limits
