export function isWarrantyActive(
  status: string,
  endDate: Date,
  now = new Date(),
): boolean {
  return status === 'active' && endDate.getTime() >= now.getTime();
}
