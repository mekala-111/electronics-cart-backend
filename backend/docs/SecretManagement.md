# Secret Management

## Rules

- Secrets live only in environment / secret manager — never in git.
- Templates: `backend/.env.example` (dev), `backend/.env.production.example` (prod placeholders).
- Production requires strong JWT (≥32), distinct refresh secret, Razorpay + Shiprocket credentials, SMTP_HOST.

## Audit checklist (pre-push)

```bash
# From repo root after git init — ensure zero matches for real secrets
rg -n "sk_live_|rzp_live_|BEGIN (RSA |OPENSSH )?PRIVATE|AKIA[0-9A-Z]{16}" \
  --glob '!**/node_modules/**' --glob '!**/.env' || true

# Confirm env files ignored
git check-ignore -v backend/.env backend/.env.production
```

## Rotation

Rotate JWT, Razorpay, Shiprocket, SMTP, and DB passwords if any `.env` was shared or copied into chat/logs.
