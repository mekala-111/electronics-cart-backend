# Security

| Control | Implementation |
|---------|----------------|
| Helmet | Enabled in `main.ts` |
| CORS | Configurable origins |
| Rate limit | `@nestjs/throttler` global guard |
| JWT | Global `JwtAuthGuard` + roles/permissions guards |
| Validation | Whitelist + forbid non-whitelisted |
| XSS / injection | DTO validation + Helmet; sanitize at trust boundaries |
| CSRF | Cookie auth not used yet; CSRF ready when cookie sessions land |
| Secrets | Via env only; never commit `.env` |

Replace all `JWT_*` and infrastructure credentials before staging/production.
