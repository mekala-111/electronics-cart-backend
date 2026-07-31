# Production Checklist

- [ ] Secrets rotated; env validation passes
- [ ] TLS certificates installed
- [ ] Nginx config tested (`nginx -t`)
- [ ] PM2 or Compose prod running API + worker
- [ ] Health live/ready in LB
- [ ] Backups scheduled + verified
- [ ] Monitoring exporters online
- [ ] Rate limits observed under k6
- [ ] Swagger disabled
- [ ] PAYMENTS_MOCK=false
- [ ] Restore drill documented with date
- [ ] On-call contacts in OperationsRunbook
