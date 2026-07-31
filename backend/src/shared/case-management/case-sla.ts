import type { CasePriority, CaseSlaPolicy, CaseSnapshot } from './case.types';

export function computeDueAt(
  openedAt: Date,
  priority: CasePriority,
  sla: CaseSlaPolicy,
): Date {
  const mult = sla.priorityMultiplier?.[priority] ?? defaultMultiplier(priority);
  const minutes = Math.max(1, Math.round(sla.resolveMinutes / mult));
  return new Date(openedAt.getTime() + minutes * 60_000);
}

export function computeResponseDueAt(
  openedAt: Date,
  priority: CasePriority,
  sla: CaseSlaPolicy,
): Date {
  const mult = sla.priorityMultiplier?.[priority] ?? defaultMultiplier(priority);
  const minutes = Math.max(1, Math.round(sla.responseMinutes / mult));
  return new Date(openedAt.getTime() + minutes * 60_000);
}

export function isResponseBreached(
  snap: CaseSnapshot,
  sla: CaseSlaPolicy,
  now = new Date(),
): boolean {
  if (snap.assigneeId) return false;
  return now.getTime() > computeResponseDueAt(snap.openedAt, snap.priority, sla).getTime();
}

export function isResolveBreached(
  snap: CaseSnapshot,
  sla: CaseSlaPolicy,
  terminalStatuses: readonly string[],
  now = new Date(),
): boolean {
  if (terminalStatuses.includes(snap.status)) return false;
  if (snap.closedAt) return false;
  const due = snap.dueAt ?? computeDueAt(snap.openedAt, snap.priority, sla);
  return now.getTime() > due.getTime();
}

function defaultMultiplier(priority: CasePriority): number {
  switch (priority) {
    case 1:
      return 2;
    case 2:
      return 1.5;
    case 3:
      return 1;
    case 4:
      return 0.75;
    case 5:
      return 0.5;
    default:
      return 1;
  }
}
