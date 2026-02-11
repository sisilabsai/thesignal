const rateLimits = globalThis.__signalRateLimits || new Map();
if (!globalThis.__signalRateLimits) {
  globalThis.__signalRateLimits = rateLimits;
}

export const RATE_LIMIT = { windowMs: 60000, limit: 20 };

export function checkRateLimit(key) {
  const now = Date.now();
  let entry = rateLimits.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + RATE_LIMIT.windowMs };
  }
  entry.count += 1;
  rateLimits.set(key, entry);
  const remaining = Math.max(RATE_LIMIT.limit - entry.count, 0);
  return { allowed: entry.count <= RATE_LIMIT.limit, remaining, resetAt: entry.resetAt };
}
