# Monitoring — Electronics Cart

## API

`api_request_logs`: method, path, `status_code`, `latency_ms`, user, IP, `request_id`.

## Errors

`error_logs`: source, code, message, stack, optional user/`request_id`.

## Jobs

`background_job_logs`: job name/id, `job_run_status`, attempts, timings, payload, errors (retries visible via `attempt` + `retrying`).

## Webhooks

`webhook_logs`: source (Razorpay, Shiprocket, …), event type, success, status code, latency, retries.

Correlate customer-impacting failures with `system_events` and domain webhook tables (payment/shipping) via timestamps and external ids in payload.

## Alerting (optional pre-lock)

| Table | Role |
|-------|------|
| `alert_rules` | Condition expression, severity (`info` / `warning` / `critical`), cooldown, enabled |
| `alert_notifications` | Channel targets (email, Slack, webhook URL, etc.) per rule |
| `alert_history` | Append-only fire log; optional ack by `users` |

Typical rule sources: high `api_request_logs` error rates, inventory shortages (inventory metrics), payment failures, job/webhook SLA breaches. Pair with `live_metrics` / `metric_streams` for flash-sale and ops dashboards.
