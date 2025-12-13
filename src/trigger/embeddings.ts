import { task } from "@trigger.dev/sdk/v3";
import { generateEmbedding, prepareTextForEmbedding } from "@/lib/embeddings";
import { upsertVectors, VectorMetadata } from "@/lib/pinecone";
import { prisma } from "@/lib/db";
import { nanoid } from "nanoid";

// Task: Generate embeddings for canvas content
export const generateCanvasEmbeddings = task({
  id: "generate-canvas-embeddings",
  maxDuration: 300,
  run: async (payload: {
    canvasId: string;
    items: {
      id: string;
      text: string;
      sourceType: VectorMetadata["sourceType"];
    }[];
  }) => {
    const { canvasId, items } = payload;
    
    console.log(`Generating embeddings for ${items.length} items in canvas ${canvasId}`);

    const vectors: {
      id: string;
      values: number[];
      metadata: VectorMetadata;
    }[] = [];

    for (const item of items) {
      try {
        const cleanedText = prepareTextForEmbedding(item.text);
        if (!cleanedText || cleanedText.length < 3) continue;

        const embedding = await generateEmbedding(cleanedText);
        const vectorId = `${canvasId}-${item.sourceType}-${item.id}`;

        vectors.push({
          id: vectorId,
          values: embedding,
          metadata: {
            canvasId,
            sourceType: item.sourceType,
            sourceId: item.id,
            text: cleanedText.substring(0, 1000), // Store truncated text for reference
            createdAt: new Date().toISOString(),
          },
        });

        // Store reference in database
        await prisma.embedding.upsert({
          where: { pineconeId: vectorId },
          create: {
            pineconeId: vectorId,
            sourceType: item.sourceType.toUpperCase() as any,
            sourceId: item.id,
            canvasId,
            text: cleanedText,
          },
          update: {
            text: cleanedText,
          },
        });
      } catch (error) {
        console.error(`Failed to embed item ${item.id}:`, error);
      }
    }

    // Batch upsert to Pinecone
    if (vectors.length > 0) {
      await upsertVectors(vectors);
      console.log(`Upserted ${vectors.length} vectors to Pinecone`);
    }

    return { 
      success: true, 
      embeddedCount: vectors.length,
      totalItems: items.length,
    };
  },
});

// Task: Generate embedding for a single item (real-time)
export const generateSingleEmbedding = task({
  id: "generate-single-embedding",
  maxDuration: 60,
  run: async (payload: {
    canvasId: string;
    itemId: string;
    text: string;
    sourceType: VectorMetadata["sourceType"];
  }) => {
    const { canvasId, itemId, text, sourceType } = payload;
    
    const cleanedText = prepareTextForEmbedding(text);
    if (!cleanedText || cleanedText.length < 3) {
      return { success: false, reason: "Text too short" };
    }

    const embedding = await generateEmbedding(cleanedText);
    const vectorId = `${canvasId}-${sourceType}-${itemId}`;

    await upsertVectors([{
      id: vectorId,
      values: embedding,
      metadata: {
        canvasId,
        sourceType,
        sourceId: itemId,
        text: cleanedText.substring(0, 1000),
        createdAt: new Date().toISOString(),
      },
    }]);

    await prisma.embedding.upsert({
      where: { pineconeId: vectorId },
      create: {
        pineconeId: vectorId,
        sourceType: sourceType.toUpperCase() as any,
        sourceId: itemId,
        canvasId,
        text: cleanedText,
      },
      update: {
        text: cleanedText,
      },
    });

    return { success: true, vectorId };
  },
});
