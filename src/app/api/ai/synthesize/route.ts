import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { 
  synthesizeRateLimit, 
  dailyAILimit, 
  checkRateLimit, 
  getRateLimitHeaders,
  rateLimitResponse 
} from "@/lib/rate-limit";
import { logAIRequest } from "@/lib/ai-observability";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check rate limits
  const [minuteLimit, dailyLimit] = await Promise.all([
    checkRateLimit(synthesizeRateLimit, user.id),
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
      { 
        status: 429, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }

  const startTime = Date.now();
  let success = false;
  let errorMessage: string | undefined;

  try {
    const { content, type = "summarize", canvasId } = await req.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const prompts: Record<string, string> = {
      summarize: `You are the "Janitor" AI assistant for a collaborative canvas tool. 
Your job is to synthesize and summarize messy content into clear, actionable insights.

Analyze the following content from the canvas and provide:
1. A brief summary (2-3 sentences)
2. Key points (bullet list, max 5)
3. Action items (if any)
4. Main themes (list of keywords)

Return your response as a JSON object with these fields:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "actionItems": ["...", "..."],
  "themes": ["...", "..."]
}

Content to analyze:
${content}`,

      cluster: `You are the "Janitor" AI assistant analyzing canvas content for semantic relationships.

Analyze this content and identify clusters/groups of related items:
${content}

Return a JSON object with:
{
  "clusters": [
    { "name": "...", "items": ["..."], "description": "..." }
  ],
  "connections": [
    { "from": "cluster1", "to": "cluster2", "relationship": "..." }
  ]
}`,

      complete: `You are the "Janitor" AI assistant helping complete a flowchart or diagram.

Based on this partial flowchart/diagram content:
${content}

Suggest the next logical steps or branches. Return as JSON:
{
  "suggestions": [
    { "type": "next_step", "content": "...", "reason": "..." }
  ]
}`,
    };

    const prompt = prompts[type] || prompts.summarize;

    // Wrap in Sentry span for tracing
    return await Sentry.startSpan(
      {
        name: "ai.synthesize",
        op: "ai.inference",
        attributes: {
          "ai.model": "gemini-2.5-pro-preview-06-05",
          "ai.type": type,
          "ai.user_id": user.id,
          "ai.content_length": content.length,
        },
      },
      async () => {
        const result = streamText({
          model: google("gemini-2.5-pro-preview-06-05"),
          prompt,
          temperature: 0.7,
          maxTokens: 1024,
          onFinish: async ({ usage }) => {
            // Log the request after completion
            const latencyMs = Date.now() - startTime;
            await logAIRequest({
              userId: user.id,
              canvasId,
              model: "gemini-2.5-pro-preview-06-05",
              type: "synthesize",
              inputTokens: usage?.promptTokens,
              outputTokens: usage?.completionTokens,
              latencyMs,
              success: true,
              metadata: { promptType: type },
            });
          },
        });

        success = true;
        const response = result.toDataStreamResponse();
        
        // Add rate limit headers
        const headers = new Headers(response.headers);
        Object.entries(getRateLimitHeaders(minuteLimit)).forEach(([key, value]) => {
          headers.set(key, value);
        });

        return new Response(response.body, {
          status: response.status,
          headers,
        });
      }
    );
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[AI Synthesize Error]", error);
    Sentry.captureException(error);

    // Log failed request
    await logAIRequest({
      userId: user.id,
      model: "gemini-2.5-pro-preview-06-05",
      type: "synthesize",
      latencyMs: Date.now() - startTime,
      success: false,
      error: errorMessage,
    });

    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
