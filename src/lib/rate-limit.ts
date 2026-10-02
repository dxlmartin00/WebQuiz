// In-memory sliding window rate limiter for Next.js API routes

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Automatically clean up stale keys every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 60000 * 10);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 300000);
}

export interface RateLimitOptions {
  limit?: number;        // Max requests allowed within window (default: 10)
  windowMs?: number;     // Sliding window in milliseconds (default: 60,000ms / 1 min)
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): { isAllowed: boolean; remaining: number; resetMs: number } {
  const limit = options.limit ?? 10;
  const windowMs = options.windowMs ?? 60000;
  const now = Date.now();

  const record = rateLimitStore.get(identifier) ?? { timestamps: [] };

  // Remove timestamps outside the sliding window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetMs = Math.max(0, oldest + windowMs - now);
    rateLimitStore.set(identifier, record);
    return { isAllowed: false, remaining: 0, resetMs };
  }

  record.timestamps.push(now);
  rateLimitStore.set(identifier, record);

  return {
    isAllowed: true,
    remaining: limit - record.timestamps.length,
    resetMs: windowMs,
  };
}
