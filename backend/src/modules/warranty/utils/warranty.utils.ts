export function shortId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
