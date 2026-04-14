// Upstash Redis rate limiting has been removed
// This file provides placeholder rate limiting functions

// Rate limiters for different features (placeholder implementation)

// General API rate limit: 100 requests per minute (placeholder)
export const generalRateLimit = {
  limit: async (identifier: string) => ({
    success: true,
    limit: 100,
    remaining: 99,
    reset: Date.now() + 60000,
  }),
};

// AI Synthesize: 20 requests per minute (placeholder)
export const synthesizeRateLimit = {
  limit: async (identifier: string) => ({
    success: true,
    limit: 20,
    remaining: 19,
    reset: Date.now() + 60000,
  }),
};

// AI Cluster: 15 requests per minute (placeholder)
export const clusterRateLimit = {
  limit: async (identifier: string) => ({
    success: true,
    limit: 15,
    remaining: 14,
    reset: Date.now() + 60000,
  }),
};

// AI Search: 30 requests per minute (placeholder)
export const searchRateLimit = {
  limit: async (identifier: string) => ({
    success: true,
    limit: 30,
    remaining: 29,
    reset: Date.now() + 60000,
  }),
};

// Embedding generation: 50 requests per minute (placeholder)
export const embeddingRateLimit = {
  limit: async (identifier: string) => ({
    success: true,
    limit: 50,
    remaining: 49,
    reset: Date.now() + 60000,
  }),
};

// Canvas operations: 200 requests per minute (placeholder)
export const canvasRateLimit = {
  limit: async (identifier: string) => ({
    success: true,
    limit: 200,
    remaining: 199,
    reset: Date.now() + 60000,
  }),
};

// Daily AI limit: 500 requests per day (placeholder)
export const dailyAILimit = {
  limit: async (identifier: string) => ({
    success: true,
    limit: 500,
    remaining: 499,
    reset: Date.now() + 24 * 60 * 60 * 1000,
  }),
};

// Check rate limit (placeholder)
export async function checkRateLimit(limiter: any, identifier: string) {
  console.warn("Rate limiting is disabled (Upstash Redis removed).");
  return await limiter.limit(identifier);
}

// Get rate limit headers (placeholder)
export function getRateLimitHeaders(limitResult: any) {
  return {
    "X-RateLimit-Limit": limitResult.limit.toString(),
    "X-RateLimit-Remaining": limitResult.remaining.toString(),
    "X-RateLimit-Reset": limitResult.reset.toString(),
  };
}

// Rate limit response (placeholder)
export function rateLimitResponse(resetTime: number) {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
  
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
