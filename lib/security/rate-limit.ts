/**
 * YRL In-Memory Sliding-Window Rate Limiter
 *
 * PROCESS-LOCAL ABUSE PROTECTION:
 * - Operates entirely in-memory within the local Node.js / serverless execution context.
 * - Suitable for current single-instance deployment architecture.
 * - Automatically prunes expired records on access to guarantee bounded memory usage.
 *
 * ARCHITECTURAL LIMITATIONS:
 * 1. Process-Local: State is not shared across multi-container instances or serverless workers.
 * 2. Volatile: Counters reset when the server process restarts.
 * 3. Best-Effort: Provides application-layer flood and brute-force mitigation.
 *    Distributed rate limiting (e.g. Upstash Redis or dedicated SQL table) is reserved for future horizontal scaling.
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp in ms
  retryAfterSeconds: number;
}

// Centralized rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  // Public submissions: 10 requests per 10 minutes per IP (supports shared CGNAT mobile networks in Ghana)
  PUBLIC_SUBMISSION: {
    maxRequests: 10,
    windowMs: 10 * 60 * 1000,
  },
  // Admin authentication: 5 attempts per 15 minutes per IP
  ADMIN_LOGIN: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  },
} as const;

export class InMemoryRateLimiter {
  private tracker: Map<string, number[]>;
  private maxRequests: number;
  private windowMs: number;
  private lastPruneTime: number;
  private pruneIntervalMs: number;

  constructor(config: RateLimitConfig) {
    this.tracker = new Map();
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
    this.lastPruneTime = Date.now();
    this.pruneIntervalMs = 60 * 1000; // Prune at most once per minute
  }

  /**
   * Check if a request is allowed and record the attempt if allowed.
   * Accepts an optional currentTime parameter for deterministic unit testing.
   */
  public check(identifier: string, currentTime = Date.now()): RateLimitResult {
    try {
      this.maybePrune(currentTime);

      const timestamps = this.tracker.get(identifier) || [];
      const validTimestamps = timestamps.filter((t) => currentTime - t < this.windowMs);

      if (validTimestamps.length >= this.maxRequests) {
        const oldest = validTimestamps[0];
        const resetAt = oldest + this.windowMs;
        const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - currentTime) / 1000));

        return {
          allowed: false,
          limit: this.maxRequests,
          remaining: 0,
          resetAt,
          retryAfterSeconds,
        };
      }

      validTimestamps.push(currentTime);
      this.tracker.set(identifier, validTimestamps);

      const remaining = this.maxRequests - validTimestamps.length;
      const oldest = validTimestamps[0];
      const resetAt = oldest + this.windowMs;

      return {
        allowed: true,
        limit: this.maxRequests,
        remaining,
        resetAt,
        retryAfterSeconds: 0,
      };
    } catch (err) {
      // Fail open: never crash the application due to rate limiter internal failure
      console.error('[RateLimiter Error] Failed to evaluate rate limit:', err);
      return {
        allowed: true,
        limit: this.maxRequests,
        remaining: 1,
        resetAt: currentTime + this.windowMs,
        retryAfterSeconds: 0,
      };
    }
  }

  /**
   * Reset rate limit state for an identifier (useful for tests or successful login)
   */
  public reset(identifier?: string): void {
    if (identifier) {
      this.tracker.delete(identifier);
    } else {
      this.tracker.clear();
    }
  }

  /**
   * Prunes expired timestamps and entries to prevent unbounded memory growth.
   */
  public prune(currentTime = Date.now()): number {
    let prunedCount = 0;
    for (const [key, timestamps] of this.tracker.entries()) {
      const valid = timestamps.filter((t) => currentTime - t < this.windowMs);
      if (valid.length === 0) {
        this.tracker.delete(key);
        prunedCount++;
      } else if (valid.length < timestamps.length) {
        this.tracker.set(key, valid);
      }
    }
    this.lastPruneTime = currentTime;
    return prunedCount;
  }

  /**
   * Periodic pruning trigger
   */
  private maybePrune(currentTime: number): void {
    if (currentTime - this.lastPruneTime >= this.pruneIntervalMs) {
      this.prune(currentTime);
    }
  }

  public getTrackerSize(): number {
    return this.tracker.size;
  }
}

// Singletons for application Server Actions
export const publicSubmissionRateLimiter = new InMemoryRateLimiter(RATE_LIMIT_CONFIGS.PUBLIC_SUBMISSION);
export const adminLoginRateLimiter = new InMemoryRateLimiter(RATE_LIMIT_CONFIGS.ADMIN_LOGIN);

/**
 * Extracts client IP from Next.js request headers.
 * Safely parses x-forwarded-for or x-real-ip headers.
 */
export function extractClientIp(headersList: { get: (name: string) => string | null }): string {
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = headersList.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
