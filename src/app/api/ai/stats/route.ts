import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { getAIUsageStats, getPlatformAIStats } from "@/lib/ai-observability";

// GET /api/ai/stats - Get AI usage statistics
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30");
  const scope = searchParams.get("scope") || "user"; // "user" or "platform"

  try {
    if (scope === "platform") {
      // For now, allow any user to see platform stats
      // In production, add admin check here
      const stats = await getPlatformAIStats(days);
      return NextResponse.json({ scope: "platform", ...stats });
    }

    // User-specific stats
    const stats = await getAIUsageStats(user.id, days);
    return NextResponse.json({ scope: "user", userId: user.id, ...stats });
  } catch (error) {
    console.error("[AI Stats Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
