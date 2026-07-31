# Relations Report

Seed order `54000000-0000-0000-0000-000000000001` present: **yes**

## Table presence

- orders: present
- payments: present
- shipments: present
- warranty_registrations: present
- service_tickets: present
- campaign_attribution: present
- audit_logs: present

## Join verification

| Check | Rows | Status |
| --- | ---: | --- |
| demo user exists | 1 | OK |
| seed order EC-2026-000001 | 1 | OK |
| order → payments | 1 | OK |
| order → shipments | 1 | OK |
| order → warranty_registrations | 1 | OK |
| warranty_registrations → service_tickets | 1 | OK |
| order → campaign_attribution | 1 | OK |
| order → audit_logs (entity) | 1 | OK |
| full chain order→payment→shipment | 1 | OK |

## Transaction probe

Disposable insert verified inside transaction (rolled back)
