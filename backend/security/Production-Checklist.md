# Production Checklist

See also `docs/ProductionChecklist.md`.

Pre-cutover:
- [ ] DNS + TLS certificates
- [ ] Secrets rotated from defaults
- [ ] Migrations 001–045 applied (locked schema)
- [ ] Backup + restore drill completed
- [ ] Smoke: login, catalog search, checkout path (staging)
- [ ] Workers processing queues
- [ ] Monitoring exporters scraping
- [ ] On-call runbook reviewed
