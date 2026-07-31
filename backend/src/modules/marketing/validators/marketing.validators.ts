export function isCouponActive(
  status: string,
  startsAt?: Date | null,
  expiresAt?: Date | null,
  now = new Date(),
): boolean {
  if (status !== 'active') return false;
  if (startsAt && startsAt > now) return false;
  if (expiresAt && expiresAt < now) return false;
  return true;
}
