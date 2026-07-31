import { registerAs } from '@nestjs/config';

/**
 * Append Prisma connection pool knobs when absent.
 * Does not change schema — URL query params only.
 */
export function withPrismaPoolParams(url: string): string {
  try {
    const u = new URL(url);
    if (!u.searchParams.has('connection_limit')) {
      u.searchParams.set(
        'connection_limit',
        process.env.PRISMA_CONNECTION_LIMIT ?? '10',
      );
    }
    if (!u.searchParams.has('pool_timeout')) {
      u.searchParams.set(
        'pool_timeout',
        process.env.PRISMA_POOL_TIMEOUT ?? '10',
      );
    }
    return u.toString();
  } catch {
    return url;
  }
}

export default registerAs('database', () => {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error('DATABASE_URL is required');
  }

  const url = withPrismaPoolParams(raw);

  return {
    url,
    directUrl: process.env.DIRECT_URL ?? url,
    connectionLimit: Number(process.env.PRISMA_CONNECTION_LIMIT ?? 10),
  };
});
