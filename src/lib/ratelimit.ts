import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Distributed rate limiter for Vercel serverless multi-instance deployments.
// Each Server Action that needs rate limiting creates its own limiter instance
// with an appropriate prefix to avoid key collisions.

function createRedis() {
  return Redis.fromEnv(); // reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
}

/**
 * Rate limiter for student invite code claims.
 * Sliding window: 5 attempts per 60 seconds per IP.
 */
export const inviteRateLimiter = new Ratelimit({
  redis: createRedis(),
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "ratelimit:invite",
});

/**
 * Rate limiter for authentication attempts (login/register).
 * Sliding window: 10 attempts per 60 seconds per IP.
 */
export const authRateLimiter = new Ratelimit({
  redis: createRedis(),
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
  prefix: "ratelimit:auth",
});
