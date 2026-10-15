import { logger } from '../platform/logger';

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = 3,
  shouldRetry?: (err: unknown) => boolean
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (shouldRetry && !shouldRetry(err)) throw err;
      const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
      logger.warn(`${label} intento ${attempt}/${maxAttempts} falló`, err);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}
