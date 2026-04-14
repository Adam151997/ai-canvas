import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { clusterContent } from "@/lib/ai";
import * as Sentry from "@sentry/nextjs";
import { 
  clusterRateLimit, 
  dailyAILimit, 
  checkRateLimit, 
  getRateLimitHeaders,
  rateLimitResponse 
} from "@/lib/rate-limit";
import { logAIRequest } from "@/lib/ai-observability";

// POST /api/ai/cluster - Cluster content semantically
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check rate limits
  const [minuteLimit, dailyLimit] = await Promise.all([
    checkRateLimit(clusterRateLimit, user.id),
    checkRateLimit(dailyAILimit, user.id),
  ]);

  if (!minuteLimit.success) {
    return rateLimitResponse(minuteLimit.reset);
  }

  if (!dailyLimit.success) {
    return new Response(
      JSON.stringify({
        error: "Daily limit exceeded",
        message: "You've reached your daily AI usage limit. Try again tomorrow.",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const startTime = Date.now();

  try {
    const { items, canvasId } = await req.json();

    if (!items || !Array.isArray(items) || items.length < 2) {
      return NextResponse.json(
        { error: "At least 2 items are required for clustering" },
        { status: 400 }
      );
    }

    // Wrap in Sentry span for tracing
    const result = await Sentry.startSpan(
      {
        name: "ai.cluster",
        op: "ai.inference",
        attributes: {
          "ai.type": "cluster",
          "ai.user_id": user.id,
          "ai.item_count": items.length,
        },
      },
      async () => {
        return await clusterContent(items);
      }
    );

    const latencyMs = Date.now() - startTime;

    // Log successful request
    await logAIRequest({
      userId: user.id,
      canvasId,
      model: "gemini-2.5-pro-preview-06-05",
      type: "cluster",
      latencyMs,
      success: true,
      metadata: {
        itemCount: items.length,
        clusterCount: result.clusters.length,
        connectionCount: result.connections.length,
      },
    });

    const response = NextResponse.json({
      clusters: result.clusters,
      connections: result.connections,
      meta: {
        itemCount: items.length,
        clusterCount: result.clusters.length,
        connectionCount: result.connections.length,
        durationMs: latencyMs,
      },
    });

    // Add rate limit headers
    Object.entries(getRateLimitHeaders(minuteLimit)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("[AI Cluster Error]", error);
    Sentry.captureException(error);

    // Log failed request
    await logAIRequest({
      userId: user.id,
      model: "gemini-2.5-pro-preview-06-05",
      type: "cluster",
      latencyMs,
      success: false,
      error: errorMessage,
    });

    return NextResponse.json(
      { error: "Clustering failed" },
      { status: 500 }
    );
  }
}
