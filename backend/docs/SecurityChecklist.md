# Security Checklist

See `backend/security/` for OWASP, hardening, pen-test, and production checklists.

App controls added in Phase K:
- Helmet CSP / HSTS / frame / referrer / permissions policy
- Env validation on boot
- Redis-backed multi-bucket rate limits
- Admin IP allowlist (optional)
- Sensitive request audit logging
- Swagger off in production validation
- No stack traces in client error bodies
