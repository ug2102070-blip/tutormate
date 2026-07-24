import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function createRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }
  try {
    return Redis.fromEnv();
  } catch {
    return null;
  }
}

const redisInstance = createRedis();

/**
 * Simple in-memory sliding window rate limiter fallback for dev or single-instance envs.
 */
class InMemoryRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private max: number;
  private windowMs: number;

  constructor(max: number, windowMs: number) {
    this.max = max;
    this.windowMs = windowMs;
  }

  async limit(key: string) {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

    if (validTimestamps.length >= this.max) {
      return {
        success: false,
        limit: this.max,
        remaining: 0,
        reset: now + this.windowMs,
      };
    }

    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);

    return {
      success: true,
      limit: this.max,
      remaining: this.max - validTimestamps.length,
      reset: now + this.windowMs,
    };
  }
}

const fallbackInviteLimiter = new InMemoryRateLimiter(5, 60 * 1000);
const fallbackAuthLimiter = new InMemoryRateLimiter(10, 60 * 1000);

/**
 * Rate limiter for student invite code claims.
 * Sliding window: 5 attempts per 60 seconds per IP.
 */
export const inviteRateLimiter = redisInstance
  ? new Ratelimit({
      redis: redisInstance,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      analytics: true,
      prefix: "ratelimit:invite",
    })
  : fallbackInviteLimiter;

/**
 * Rate limiter for authentication attempts (login/register).
 * Sliding window: 10 attempts per 60 seconds per IP.
 */
export const authRateLimiter = redisInstance
  ? new Ratelimit({
      redis: redisInstance,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      analytics: true,
      prefix: "ratelimit:auth",
    })
  : fallbackAuthLimiter;

