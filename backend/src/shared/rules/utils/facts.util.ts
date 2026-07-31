import type { FactValue, Facts } from '../types/rule.types';

const PATH_RE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

export function isValidPath(path: string): boolean {
  return PATH_RE.test(path);
}

/**
 * Resolve dotted path on facts. Uses cache for repeated lookups in one evaluate().
 * Never mutates facts.
 */
export function resolvePath(
  facts: Facts,
  path: string,
  cache: Map<string, FactValue>,
): { ok: true; value: FactValue } | { ok: false; error: string } {
  if (!isValidPath(path)) {
    return { ok: false, error: `Invalid field path: ${path}` };
  }
  if (cache.has(path)) {
    return { ok: true, value: cache.get(path) };
  }

  const parts = path.split('.');
  let cur: FactValue = facts as FactValue;
  for (const part of parts) {
    if (cur === null || cur === undefined) {
      cache.set(path, undefined);
      return { ok: true, value: undefined };
    }
    if (typeof cur !== 'object' || cur instanceof Date || Array.isArray(cur)) {
      cache.set(path, undefined);
      return { ok: true, value: undefined };
    }
    cur = (cur as Record<string, FactValue>)[part];
  }
  cache.set(path, cur);
  return { ok: true, value: cur };
}

export function deepFreezeFacts(facts: Facts): Facts {
  // Shallow freeze is enough for API contract; callers must not mutate.
  return Object.freeze({ ...facts });
}

export function toComparable(value: FactValue): {
  kind: 'number' | 'string' | 'boolean' | 'null' | 'date' | 'other';
  value: unknown;
} {
  if (value === null) return { kind: 'null', value: null };
  if (value === undefined) return { kind: 'null', value: null };
  if (typeof value === 'boolean') return { kind: 'boolean', value };
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { kind: 'number', value };
  }
  if (typeof value === 'string') {
    const asDate = Date.parse(value);
    if (!Number.isNaN(asDate) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return { kind: 'date', value: asDate };
    }
    return { kind: 'string', value };
  }
  if (value instanceof Date) return { kind: 'date', value: value.getTime() };
  return { kind: 'other', value };
}

export function valuesEqual(a: FactValue, b: FactValue): boolean {
  const ca = toComparable(a);
  const cb = toComparable(b);
  if (ca.kind === 'null' && cb.kind === 'null') return true;
  if (ca.kind === 'date' && cb.kind === 'date') return ca.value === cb.value;
  if (ca.kind !== cb.kind) return false;
  if (ca.kind === 'other') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return ca.value === cb.value;
}

export function compareOrdered(
  a: FactValue,
  b: FactValue,
): { ok: true; cmp: number } | { ok: false; error: string } {
  const ca = toComparable(a);
  const cb = toComparable(b);
  if (ca.kind === 'null' || cb.kind === 'null') {
    return { ok: false, error: 'Cannot compare null/undefined' };
  }
  if (ca.kind === 'number' && cb.kind === 'number') {
    return { ok: true, cmp: (ca.value as number) - (cb.value as number) };
  }
  if (ca.kind === 'date' && cb.kind === 'date') {
    return { ok: true, cmp: (ca.value as number) - (cb.value as number) };
  }
  if (ca.kind === 'string' && cb.kind === 'string') {
    return {
      ok: true,
      cmp: (ca.value as string).localeCompare(cb.value as string),
    };
  }
  // coerce numeric strings
  if (
    (ca.kind === 'number' || ca.kind === 'string') &&
    (cb.kind === 'number' || cb.kind === 'string')
  ) {
    const na = Number(ca.value);
    const nb = Number(cb.value);
    if (Number.isFinite(na) && Number.isFinite(nb)) {
      return { ok: true, cmp: na - nb };
    }
  }
  return { ok: false, error: `Incomparable types: ${ca.kind} vs ${cb.kind}` };
}

export function asString(value: FactValue): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}
