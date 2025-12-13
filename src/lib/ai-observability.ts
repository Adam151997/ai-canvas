import { db } from "./db";
import * as Sentry from "@sentry/nextjs";

// Cost per 1K tokens (approximate for Gemini 2.5 Pro)
const COST_PER_1K_INPUT_TOKENS = 0.00125;
const COST_PER_1K_OUTPUT_TOKENS = 0.005;

interface AIRequestLog {
  userId: string;
  canvasId?: string;
  model: string;
  type: "synthesize" | "cluster" | "search" | "embedding" | "tags" | "region";
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

// Log an AI request to the database
export async function logAIRequest(log: AIRequestLog): Promise<void> {
  try {
    // Calculate cost
    const inputCost = ((log.inputTokens || 0) / 1000) * COST_PER_1K_INPUT_TOKENS;
    const outputCost = ((log.outputTokens || 0) / 1000) * COST_PER_1K_OUTPUT_TOKENS;
    const totalCost = inputCost + outputCost;

    // Create record in database
    await db.aIRequest.create({
      data: {
        userId: log.userId,
        canvasId: log.canvasId,
        type: log.type.toUpperCase(),
        model: log.model,
        inputTokens: log.inputTokens || 0,
        outputTokens: log.outputTokens || 0,
        totalTokens: (log.inputTokens || 0) + (log.outputTokens || 0),
        cost: totalCost,
        latencyMs: log.latencyMs,
        status: log.success ? "COMPLETED" : "FAILED",
        error: log.error,
        metadata: log.metadata,
      },
    });

    // Add breadcrumb to Sentry for tracing
    Sentry.addBreadcrumb({
      category: "ai",
      message: `AI ${log.type} request`,
      level: log.success ? "info" : "error",
      data: {
        model: log.model,
        latencyMs: log.latencyMs,
        tokens: (log.inputTokens || 0) + (log.outputTokens || 0),
        cost: totalCost.toFixed(6),
      },
    });
  } catch (error) {
    console.error("Failed to log AI request:", error);
    Sentry.captureException(error);
  }
}

// Wrapper to measure and log AI operations
export async function withAILogging<T>(
  operation: () => Promise<T>,
  logData: Omit<AIRequestLog, "latencyMs" | "success" | "error">
): Promise<T> {
  const startTime = Date.now();
  
  return Sentry.startSpan(
    {
      name: `ai.${logData.type}`,
      op: "ai.request",
      attributes: {
        "ai.model": logData.model,
        "ai.type": logData.type,
        "ai.user_id": logData.userId,
      },
    },
    async (span) => {
      try {
        const result = await operation();
        const latencyMs = Date.now() - startTime;

        // Log successful request
        await logAIRequest({
          ...logData,
          latencyMs,
          success: true,
        });

        span?.setStatus({ code: 1 }); // OK
        return result;
      } catch (error) {
        const latencyMs = Date.now() - startTime;

        // Log failed request
        await logAIRequest({
          ...logData,
          latencyMs,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        span?.setStatus({ code: 2, message: String(error) }); // ERROR
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}

// Get AI usage stats for a user
export async function getAIUsageStats(userId: string, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await db.aIRequest.groupBy({
    by: ["type"],
    where: {
      userId,
      createdAt: { gte: startDate },
    },
    _count: true,
    _sum: {
      totalTokens: true,
      cost: true,
      latencyMs: true,
    },
    _avg: {
      latencyMs: true,
    },
  });

  const totalRequests = await db.aIRequest.count({
    where: {
      userId,
      createdAt: { gte: startDate },
    },
  });

  const failedRequests = await db.aIRequest.count({
    where: {
      userId,
      createdAt: { gte: startDate },
      status: "FAILED",
    },
  });

  const totalCost = await db.aIRequest.aggregate({
    where: {
      userId,
      createdAt: { gte: startDate },
    },
    _sum: {
      cost: true,
    },
  });

  return {
    byType: stats.map((s) => ({
      type: s.type,
      count: s._count,
      totalTokens: s._sum.totalTokens || 0,
      totalCost: s._sum.cost || 0,
      avgLatency: Math.round(s._avg.latencyMs || 0),
    })),
    totals: {
      requests: totalRequests,
      failed: failedRequests,
      successRate: totalRequests > 0 
        ? ((totalRequests - failedRequests) / totalRequests * 100).toFixed(1) 
        : "100",
      cost: totalCost._sum.cost || 0,
    },
    period: {
      days,
      start: startDate.toISOString(),
      end: new Date().toISOString(),
    },
  };
}

// Get AI usage stats for entire platform (admin)
export async function getPlatformAIStats(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Daily breakdown
  const dailyStats = await db.$queryRaw<
    { date: Date; count: bigint; tokens: bigint; cost: number }[]
  >`
    SELECT 
      DATE("createdAt") as date,
      COUNT(*) as count,
      COALESCE(SUM("totalTokens"), 0) as tokens,
      COALESCE(SUM("cost"), 0) as cost
    FROM "ai_requests"
    WHERE "createdAt" >= ${startDate}
    GROUP BY DATE("createdAt")
    ORDER BY date DESC
    LIMIT ${days}
  `;

  // Top users by usage
  const topUsers = await db.aIRequest.groupBy({
    by: ["userId"],
    where: {
      createdAt: { gte: startDate },
    },
    _count: true,
    _sum: {
      cost: true,
      totalTokens: true,
    },
    orderBy: {
      _count: {
        userId: "desc",
      },
    },
    take: 10,
  });

  // Error rate by type
  const errorsByType = await db.aIRequest.groupBy({
    by: ["type", "status"],
    where: {
      createdAt: { gte: startDate },
    },
    _count: true,
  });

  return {
    daily: dailyStats.map((d) => ({
      date: d.date,
      requests: Number(d.count),
      tokens: Number(d.tokens),
      cost: d.cost,
    })),
    topUsers: topUsers.map((u) => ({
      userId: u.userId,
      requests: u._count,
      tokens: u._sum.totalTokens || 0,
      cost: u._sum.cost || 0,
    })),
    errorsByType,
  };
}
