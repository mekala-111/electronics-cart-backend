/**
 * Outbound HTTP with AbortController timeout and bounded retries.
 */
export type FetchWithTimeoutOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
};

export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const {
    timeoutMs = 30_000,
    retries = 2,
    retryDelayMs = 400,
    ...init
  } = options;

  let lastError: unknown;
  const attempts = Math.max(1, retries + 1);

  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      if (res.status >= 500 || res.status === 429) {
        if (attempt < attempts - 1) {
          await sleep(retryDelayMs * 2 ** attempt);
          continue;
        }
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < attempts - 1) {
        await sleep(retryDelayMs * 2 ** attempt);
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`fetch failed: ${String(lastError)}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
