import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { generateEmbedding } from "@/lib/embeddings";
import { querySimilar } from "@/lib/pinecone";
import * as Sentry from "@sentry/nextjs";
import { 
  searchRateLimit, 
  checkRateLimit, 
  getRateLimitHeaders,
  rateLimitResponse 
} from "@/lib/rate-limit";
import { logAIRequest } from "@/lib/ai-observability";

// POST /api/ai/search - Semantic search across canvas
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check rate limit
  const rateLimit = await checkRateLimit(searchRateLimit, user.id);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit.reset);
  }

  const startTime = Date.now();

  try {
    const { query, canvasId, sourceType, topK = 10 } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Wrap in Sentry span for tracing
    const results = await Sentry.startSpan(
      {
        name: "ai.search",
        op: "ai.inference",
        attributes: {
          "ai.type": "search",
          "ai.user_id": user.id,
          "ai.query_length": query.length,
          "ai.top_k": topK,
        },
      },
      async () => {
        // Generate embedding for the search query
        const queryEmbedding = await generateEmbedding(query);

        // Search Pinecone
        return await querySimilar(queryEmbedding, {
          canvasId,
          sourceType,
          topK,
        });
      }
    );

    const latencyMs = Date.now() - startTime;

    // Format results
    const formattedResults = results.map((match) => ({
      id: match.id,
      score: match.score,
      sourceType: match.metadata?.sourceType,
      sourceId: match.metadata?.sourceId,
      text: match.metadata?.text,
      canvasId: match.metadata?.canvasId,
    }));

    // Log successful request
    await logAIRequest({
      userId: user.id,
      canvasId,
      model: "text-embedding-004",
      type: "search",
      latencyMs,
      success: true,
      metadata: {
        queryLength: query.length,
        topK,
        resultsCount: formattedResults.length,
      },
    });

    const response = NextResponse.json({
      results: formattedResults,
      query,
      totalResults: formattedResults.length,
    });

    // Add rate limit headers
    Object.entries(getRateLimitHeaders(rateLimit)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("[AI Search Error]", error);
    Sentry.captureException(error);

    // Log failed request
    await logAIRequest({
      userId: user.id,
      model: "text-embedding-004",
      type: "search",
      latencyMs,
      success: false,
      error: errorMessage,
    });

    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
