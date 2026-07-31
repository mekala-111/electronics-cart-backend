const SENSITIVE_KEY =
  /password|passwd|secret|token|jwt|authorization|api[_-]?key|card|cvv|pan|ssn|otp/i;

/**
 * Strip secrets / high-risk keys from metadata before export.
 * # ponytail: key-name filter only; deep PII redaction owned by Analytics policy.
 */
export function sanitizeMetadata(
  input?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!input) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (SENSITIVE_KEY.test(k)) continue;
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      out[k] = sanitizeMetadata(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}
