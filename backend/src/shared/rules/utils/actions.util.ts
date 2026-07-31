import type { FactValue, RuleAction } from '../types/rule.types';
import { isValidPath } from './facts.util';

/**
 * Apply deterministic actions onto a mutable working copy.
 * Original facts stay untouched.
 */
export function applyActions(
  facts: Readonly<Record<string, FactValue>>,
  actions: RuleAction[],
): { output: Record<string, FactValue>; errors: string[] } {
  const output: Record<string, FactValue> = structuredClone(facts) as Record<
    string,
    FactValue
  >;
  const errors: string[] = [];

  for (const action of actions) {
    if (!isValidPath(action.path)) {
      errors.push(`Invalid action path: ${action.path}`);
      continue;
    }
    const parts = action.path.split('.');
    const last = parts[parts.length - 1]!;
    let parent: Record<string, FactValue> = output;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i]!;
      const next = parent[key];
      if (next === undefined || next === null || typeof next !== 'object' || Array.isArray(next) || next instanceof Date) {
        parent[key] = {};
      }
      parent = parent[key] as Record<string, FactValue>;
    }

    switch (action.op) {
      case 'set':
        parent[last] = action.value;
        break;
      case 'add': {
        const cur = Number(parent[last] ?? 0);
        if (!Number.isFinite(cur)) {
          errors.push(`add requires numeric ${action.path}`);
          break;
        }
        parent[last] = cur + action.value;
        break;
      }
      case 'multiply': {
        const cur = Number(parent[last] ?? 0);
        if (!Number.isFinite(cur)) {
          errors.push(`multiply requires numeric ${action.path}`);
          break;
        }
        parent[last] = cur * action.value;
        break;
      }
      case 'percent': {
        const cur = Number(parent[last] ?? 0);
        if (!Number.isFinite(cur)) {
          errors.push(`percent requires numeric ${action.path}`);
          break;
        }
        parent[last] = cur * (1 + action.value / 100);
        break;
      }
      case 'append_tag': {
        const cur = parent[last];
        if (cur === undefined || cur === null) {
          parent[last] = [action.value];
        } else if (Array.isArray(cur)) {
          parent[last] = [...cur, action.value];
        } else {
          errors.push(`append_tag requires array at ${action.path}`);
        }
        break;
      }
      default:
        errors.push(`Unknown action op`);
    }
  }

  return { output, errors };
}
