# Device Lifecycle

Aggregated by serial (`WarrantyService.deviceHistory` / cache `service:device:{serialId}`):

1. Purchase / order linkage on registration
2. Warranty registration + extensions + transfers
3. Claims
4. RMAs
5. Service tickets + appointments (ticket-based)
6. Diagnostics (`diagnostic_reports`) + `device_health_reports`
7. Repair jobs + part usage
8. Replacement requests (`device.replaced` event)
9. Loan allocations during repair
