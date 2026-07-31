# Service Center Architecture

Models: `service_centers`, `service_center_locations`, `technicians`, `technician_skills`, `service_sla`.

Centers cached under `service:centers:list`. Tickets bind to a center; optional location + SLA.

Dashboard: `GET /api/admin/service/dashboard` — open claims/tickets/repairs/RMAs + available loan devices.
