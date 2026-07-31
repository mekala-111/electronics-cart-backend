export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  DEFAULT: 300,
} as const;

export function cacheKey(...parts: (string | number)[]): string {
  return parts.map(String).join(':');
}
