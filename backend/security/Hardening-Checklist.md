# Hardening Checklist

- [ ] `validateEnvironment` passes on boot
- [ ] `TRUST_PROXY=true` behind Nginx
- [ ] `ENFORCE_ADMIN_IP_ALLOWLIST` configured
- [ ] Redis AOF + maxmemory-policy set
- [ ] Postgres backups verified (`backup/verify-backup.sh`)
- [ ] PM2 API cluster + separate worker
- [ ] Nginx TLS + rate zones active
- [ ] Health `/live` + `/ready` in load balancer
- [ ] Log redaction for Authorization / passwords
- [ ] PAYMENTS_MOCK=false in production
- [ ] SWAGGER_ENABLED=false in production
