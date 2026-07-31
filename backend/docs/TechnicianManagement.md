# Technician Management

Model: `technicians` (not `service_technicians`).

- Availability: `is_available`
- Assignment: `POST /api/admin/service/assign` (lock + CaseManager transition `created→assigned` + assign)
- Skills / certifications: schema tables read via list technicians cache key `service:tech:{centerId}`
- Schedules / appointments tables are **absent** — `GET /api/service/appointments` returns assigned open tickets as schedule slots
