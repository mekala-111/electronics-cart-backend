# Password Policy

## Requirements

Passwords must satisfy all of:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character (non-alphanumeric)

Enforced by `@IsStrongPassword()` validator and `PasswordService.isStrongPassword()`.

## Storage

- Algorithm: **Argon2id** via the `argon2` package
- Column: `users.password_hash`
- No password history table in schema — previous passwords are not retained

## Flows

| Flow | Behavior |
| --- | --- |
| Register | Hash before insert |
| Login | `argon2.verify` against stored hash |
| Change password | Verify current, hash new, revoke tokens/sessions |
| Reset password | OTP verification then hash new password |

## Lockout

After `MAX_FAILED_LOGINS` (5) failed attempts, `locked_until` is set for `LOCKOUT_MINUTES` (30).
