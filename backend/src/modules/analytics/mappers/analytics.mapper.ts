export function toDashboardDto(payload: {
  code: string;
  name: string;
  refreshedAt: string;
  widgets: unknown[];
}) {
  return payload;
}
