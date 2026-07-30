/**
 * [SEC-03] Login Rate Limiter
 *
 * Prevents brute-force attacks on the login endpoint.
 * Tracks failed attempts per IP in a 15-minute sliding window.
 * Blocks after MAX_ATTEMPTS consecutive failures.
 *
 * Note: This is an in-memory implementation suitable for single-instance
 * deployments. For multi-instance/distributed setups, use Redis instead.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
}

// Global in-memory store — persists across requests in same Node.js process
const attemptStore = new Map<string, AttemptRecord>();

/**
 * Periodically clean up old entries to prevent unbounded memory growth.
 * Runs every 5 minutes.
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of attemptStore.entries()) {
      if (now - record.firstAttemptAt > WINDOW_MS * 2) {
        attemptStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Check if an IP is currently rate-limited.
 * Returns the number of seconds remaining if blocked, or 0 if allowed.
 */
export function getRateLimitStatus(ip: string): { blocked: boolean; retryAfterSeconds: number } {
  const record = attemptStore.get(ip);
  if (!record) return { blocked: false, retryAfterSeconds: 0 };

  const now = Date.now();

  // Window has expired — reset
  if (now - record.firstAttemptAt > WINDOW_MS) {
    attemptStore.delete(ip);
    return { blocked: false, retryAfterSeconds: 0 };
  }

  if (record.blockedUntil && now < record.blockedUntil) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { blocked: true, retryAfterSeconds };
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

/**
 * Record a failed login attempt for an IP.
 * Blocks the IP if MAX_ATTEMPTS is reached within the window.
 */
export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const existing = attemptStore.get(ip);

  if (!existing || now - existing.firstAttemptAt > WINDOW_MS) {
    // New window
    attemptStore.set(ip, {
      count: 1,
      firstAttemptAt: now,
      blockedUntil: null,
    });
    return;
  }

  existing.count += 1;

  if (existing.count >= MAX_ATTEMPTS) {
    existing.blockedUntil = now + WINDOW_MS;
  }

  attemptStore.set(ip, existing);
}

/**
 * Clear the failed attempt record for an IP (called on successful login).
 */
export function clearAttempts(ip: string): void {
  attemptStore.delete(ip);
}
