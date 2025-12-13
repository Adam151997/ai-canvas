import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limiters for different features
// Using sliding window algorithm for smooth rate limiting

// General API rate limit: 100 requests per minute
export const generalRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
  prefix: "ratelimit:general",
});

// AI Synthesize: 20 requests per minute (expensive operation)
export const synthesizeRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  analytics: true,
  prefix: "ratelimit:synthesize",
});

// AI Cluster: 15 requests per minute
export const clusterRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(15, "1 m"),
  analytics: true,
  prefix: "ratelimit:cluster",
});

// AI Search: 30 requests per minute
export const searchRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  analytics: true,
  prefix: "ratelimit:search",
});

// Embedding generation: 50 requests per minute
export const embeddingRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, "1 m"),
  analytics: true,
  prefix: "ratelimit:embedding",
});

// Canvas operations: 200 requests per minute
export const canvasRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, "1 m"),
  analytics: true,
  prefix: "ratelimit:canvas",
});

// Daily limits for expensive AI operations
export const dailyAILimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(500, "24 h"),
  analytics: true,
  prefix: "ratelimit:daily-ai",
});

// Helper function to check rate limit
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const result = await limiter.limit(identifier);
  
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

// Get rate limit headers for response
export function getRateLimitHeaders(result: {
  limit: number;
  remaining: number;
  reset: number;
}): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };
}

// Rate limit error response
export function rateLimitResponse(reset: number) {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
      },
    }
  );
}
