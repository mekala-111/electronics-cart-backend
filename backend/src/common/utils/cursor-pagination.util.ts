export interface CursorPayload {
  [key: string]: unknown;
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor<T extends CursorPayload = CursorPayload>(
  cursor: string,
): T {
  const json = Buffer.from(cursor, 'base64url').toString('utf8');
  return JSON.parse(json) as T;
}

export function isValidCursor(cursor: string): boolean {
  try {
    decodeCursor(cursor);
    return true;
  } catch {
    return false;
  }
}
