export const WARRANTY_PERMISSIONS = {
  READ: 'warranty.read',
  WRITE: 'warranty.write',
} as const;

export const SERVICE_PERMISSIONS = {
  READ: 'service.read',
  WRITE: 'service.write',
} as const;

export const WARRANTY_CACHE = {
  TTL: 60,
  plans: () => 'warranty:plans:list',
  serial: (serial: string) => `warranty:serial:${serial}`,
  claim: (id: string) => `warranty:claim:${id}`,
  centers: () => 'service:centers:list',
  technicians: (centerId: string) => `service:tech:${centerId}`,
  device: (serialId: string) => `service:device:${serialId}`,
} as const;

export const WARRANTY_JOBS = {
  CLAIM_REVIEW: 'warranty.claim.review',
  TECH_ASSIGN: 'warranty.tech.assign',
  REPAIR_NOTIFY: 'warranty.repair.notify',
  SLA_MONITOR: 'warranty.sla.monitor',
  ESCALATION: 'warranty.escalation',
  EXPIRY_REMINDER: 'warranty.expiry.reminder',
  APPOINTMENT_REMINDER: 'warranty.appointment.reminder',
} as const;
