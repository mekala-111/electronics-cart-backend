import { createHash, randomBytes } from 'node:crypto';

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function randomToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('hex');
}

export function hashToken(token: string): string {
  return sha256(token);
}
