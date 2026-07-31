# Monitoring Guide

Configs only (no Grafana dashboards shipped):

- `monitoring/prometheus/prometheus.yml`
- `monitoring/grafana/provisioning/datasources/datasources.yml`
- `monitoring/loki/config.yml`
- `monitoring/exporters/docker-compose.exporters.yml`

Business metrics remain in the **Metrics Framework** → Analytics (`live_metrics`, domain tables). Do not add a second app metrics stack.

Use `/api/admin/analytics/system` for operational snapshots and exporters for host/DB/Redis/Nginx.
