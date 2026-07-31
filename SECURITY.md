# Security Policy

## Supported versions

Only the latest tagged release of Electronics Cart backend/database is supported for security updates.

## Reporting a vulnerability

Email security issues privately to the maintainers. Do **not** open public GitHub issues for vulnerabilities involving:

- Authentication / session handling
- Payment or shipping webhooks
- Secrets, tokens, or credential exposure

Include reproduction steps, affected version, and impact assessment.

## Secrets

Never commit `.env`, API keys, webhook secrets, private keys, or database dumps.
Use `backend/.env.production.example` as a template only.
