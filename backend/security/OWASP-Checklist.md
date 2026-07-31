# Electronics Cart — OWASP ASVS-oriented checklist (ops)
# Mark items during each release hardening pass.

## A01 Broken Access Control
- [ ] Admin routes require admin|super_admin roles
- [ ] Permissions enforced (analytics.*, report.*, etc.)
- [ ] Admin IP allowlist enabled in production if applicable
- [ ] Idempotency on money / state-changing admin writes

## A02 Cryptographic Failures
- [ ] TLS 1.2+ only at Nginx
- [ ] JWT secrets ≥ 32 chars, unique access/refresh
- [ ] No secrets in git; .env encrypted backups only

## A03 Injection
- [ ] Prisma parameterized queries only (no raw SQL with user input)
- [ ] ValidationPipe whitelist + forbidNonWhitelisted

## A04 Insecure Design
- [ ] Rate limits on auth/OTP/payment/admin
- [ ] LockService on critical mutations

## A05 Security Misconfiguration
- [ ] Helmet CSP/HSTS in production
- [ ] Swagger disabled in production
- [ ] server_tokens off; x-powered-by disabled
- [ ] Stack traces never returned to clients

## A06 Vulnerable Components
- [ ] pnpm audit / Dependabot reviewed each sprint

## A07 Identification & Authentication
- [ ] OTP rate limited
- [ ] Password policy docs followed
- [ ] Session/refresh rotation verified

## A08 Software & Data Integrity
- [ ] CI builds verified images
- [ ] Deploy scripts signed off

## A09 Security Logging & Monitoring
- [ ] SensitiveAuditMiddleware logs admin/auth/payment writes
- [ ] Correlation IDs present
- [ ] Alerts on payment failure / auth spikes

## A10 SSRF
- [ ] Webhook URLs allowlisted where applicable
- [ ] S3 endpoint controlled via env
