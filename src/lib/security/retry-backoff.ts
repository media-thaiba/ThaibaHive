/**
 * Exponential Jittered Retry Backoff Engine
 * Sprint-039 / TIF-005 (TD-015)
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  isRetryable?: (err: unknown) => boolean;
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
  sleepFn?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Executes an async operation with exponential backoff and full jitter.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 5;
  const baseDelayMs = options?.baseDelayMs ?? 100;
  const maxDelayMs = options?.maxDelayMs ?? 5000;
  const sleep = options?.sleepFn ?? defaultSleep;
  const isRetryable = options?.isRetryable ?? defaultIsRetryable;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err: unknown) {
      lastError = err;

      if (attempt >= maxAttempts || !isRetryable(err)) {
        throw err;
      }

      // Full jitter exponential backoff: random between 0 and min(maxDelay, baseDelay * 2^(attempt-1))
      const exponentialCeiling = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
      const delayMs = Math.floor(Math.random() * exponentialCeiling);

      if (options?.onRetry) {
        options.onRetry(attempt, delayMs, err);
      }

      await sleep(delayMs);
    }
  }

  throw lastError;
}

function defaultIsRetryable(err: unknown): boolean {
  if (!err) return false;

  // If error has a status property (e.g. HTTP response code)
  if (typeof err === "object" && "status" in (err as any)) {
    const status = Number((err as any).status);
    if (status === 429 || (status >= 500 && status <= 599)) {
      return true;
    }
    if (status >= 400 && status < 500) {
      return false; // Non-retryable client error
    }
  }

  // Network / timeout errors are retryable
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes("fetch failed") ||
    msg.includes("timeout") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ENOTFOUND")
  ) {
    return true;
  }

  return true;
}
