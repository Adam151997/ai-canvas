import { task, schedules } from "@trigger.dev/sdk/v3";
import { db } from "@/lib/db";
import { clusterContent, synthesizeContent } from "@/lib/ai";
import { generateEmbedding } from "@/lib/embeddings";
import { querySimilar } from "@/lib/pinecone";

// Task: Analyze and cluster canvas regions
export const analyzeCanvasRegions = task({
  id: "analyze-canvas-regions",
  maxDuration: 300,
  run: async (payload: { canvasId: string }) => {
    const { canvasId } = payload;
    
    console.log(`Analyzing regions for canvas ${canvasId}`);

    // Get all embeddings for this canvas
    const embeddings = await db.embedding.findMany({
      where: { canvasId },
      select: { sourceId: true, text: true, sourceType: true },
    });

    if (embeddings.length < 3) {
      return { success: true, reason: "Not enough content to cluster" };
    }

    // Cluster the content
    const texts = embeddings.map((e) => e.text);
    const clusterResult = await clusterContent(texts);

    // Store cluster information in canvas regions
    for (const cluster of clusterResult.clusters) {
      await db.canvasRegion.create({
        data: {
          canvasId,
          x: 0, // Would be calculated from actual shape positions
          y: 0,
          width: 500,
          height: 500,
          label: cluster.name,
          summary: cluster.description,
          keywords: cluster.items.slice(0, 5),
          clusterId: `cluster-${Date.now()}`,
        },
      });
    }

    return {
      success: true,
      clustersCreated: clusterResult.clusters.length,
      connectionsFound: clusterResult.connections.length,
    };
  },
});

// Task: Calculate decay/patina for canvas regions
export const calculateRegionDecay = task({
  id: "calculate-region-decay",
  maxDuration: 120,
  run: async (payload: { canvasId: string }) => {
    const { canvasId } = payload;
    
    const regions = await db.canvasRegion.findMany({
      where: { canvasId },
    });

    const now = new Date();
    let updatedCount = 0;

    for (const region of regions) {
      // Calculate days since last activity
      const daysSinceActivity = Math.floor(
        (now.getTime() - region.lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Decay formula: score decreases by 10% per day of inactivity
      const newScore = Math.max(0.1, region.activityScore * Math.pow(0.9, daysSinceActivity));

      if (newScore !== region.activityScore) {
        await db.canvasRegion.update({
          where: { id: region.id },
          data: { activityScore: newScore },
        });
        updatedCount++;
      }
    }

    return {
      success: true,
      regionsProcessed: regions.length,
      regionsUpdated: updatedCount,
    };
  },
});

// Task: Find semantic connections between regions
export const findSemanticConnections = task({
  id: "find-semantic-connections",
  maxDuration: 180,
  run: async (payload: { canvasId: string }) => {
    const { canvasId } = payload;
    
    const regions = await db.canvasRegion.findMany({
      where: { canvasId },
      select: { id: true, label: true, summary: true, keywords: true },
    });

    const connections: {
      from: string;
      to: string;
      similarity: number;
      reason: string;
    }[] = [];

    for (const region of regions) {
      if (!region.summary) continue;

      // Generate embedding for this region
      const embedding = await generateEmbedding(region.summary);

      // Find similar regions
      const similar = await querySimilar(embedding, {
        canvasId,
        topK: 5,
      });

      for (const match of similar) {
        if (match.score && match.score > 0.7 && match.metadata?.sourceId !== region.id) {
          connections.push({
            from: region.id,
            to: match.metadata?.sourceId as string,
            similarity: match.score,
            reason: `High semantic similarity (${(match.score * 100).toFixed(1)}%)`,
          });
        }
      }
    }

    return {
      success: true,
      connectionsFound: connections.length,
      connections,
    };
  },
});

// Task: Auto-summarize a region
export const summarizeRegion = task({
  id: "summarize-region",
  maxDuration: 120,
  run: async (payload: { canvasId: string; regionId: string; content: string }) => {
    const { canvasId, regionId, content } = payload;
    
    const result = await synthesizeContent(content);

    // Update the region with the summary
    await db.canvasRegion.update({
      where: { id: regionId },
      data: {
        summary: result.summary,
        keywords: result.themes,
        updatedAt: new Date(),
      },
    });

    // Log the AI request
    await db.aIRequest.create({
      data: {
        canvasId,
        userId: "system",
        type: "SUMMARIZE",
        status: "COMPLETED",
        input: { content: content.substring(0, 500) },
        output: result,
        completedAt: new Date(),
      },
    });

    return {
      success: true,
      summary: result.summary,
      keyPoints: result.keyPoints,
    };
  },
});

// Scheduled task: Night Shift - runs daily at 3am
export const nightShiftAnalysis = schedules.task({
  id: "night-shift-analysis",
  cron: "0 3 * * *", // 3am daily
  maxDuration: 600,
  run: async () => {
    console.log("🌙 Night Shift starting...");

    // Get all active canvases (updated in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeCanvases = await db.canvas.findMany({
      where: {
        updatedAt: { gte: sevenDaysAgo },
      },
      select: { id: true, name: true },
    });

    console.log(`Processing ${activeCanvases.length} active canvases`);

    const results = {
      canvasesProcessed: 0,
      regionsAnalyzed: 0,
      decayCalculated: 0,
      connectionsFound: 0,
    };

    for (const canvas of activeCanvases) {
      try {
        // Run decay calculation
        await calculateRegionDecay.trigger({ canvasId: canvas.id });
        results.decayCalculated++;

        // Run semantic connection finding
        await findSemanticConnections.trigger({ canvasId: canvas.id });
        results.connectionsFound++;

        results.canvasesProcessed++;
      } catch (error) {
        console.error(`Failed to process canvas ${canvas.id}:`, error);
      }
    }

    console.log("🌙 Night Shift complete:", results);
    return results;
  },
});
