import { task } from "@trigger.dev/sdk/v3";
import { db } from "@/lib/db";
import { generateEmbedding, prepareTextForEmbedding, chunkText } from "@/lib/embeddings";
import { upsertVectors, VectorMetadata } from "@/lib/pinecone";
import { put } from "@vercel/blob";
import sharp from "sharp";

// Thumbnail generation
async function createThumbnail(
  imageBuffer: Buffer,
  size: { width: number; height: number } = { width: 300, height: 300 }
): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(size.width, size.height, {
      fit: "cover",
      position: "center",
    })
    .jpeg({ quality: 80, progressive: true })
    .toBuffer();
}

// Get image metadata
async function getImageInfo(buffer: Buffer) {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || "unknown",
  };
}

// Task: Process uploaded asset (extract text, generate embeddings, create thumbnail)
export const processAsset = task({
  id: "process-asset",
  maxDuration: 300,
  run: async (payload: {
    assetId: string;
    canvasId: string;
    url: string;
    mimeType: string;
    filename: string;
  }) => {
    const { assetId, canvasId, url, mimeType, filename } = payload;
    
    console.log(`Processing asset ${assetId} (${mimeType})`);

    // Update status to processing
    await db.asset.update({
      where: { id: assetId },
      data: { status: "PROCESSING" },
    });

    try {
      let extractedText = "";
      let thumbnailUrl: string | null = null;
      let metadata: Record<string, unknown> = {};

      // Fetch the file
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Handle different file types
      if (mimeType.startsWith("image/")) {
        // Get image metadata
        const imageInfo = await getImageInfo(buffer);
        metadata = {
          width: imageInfo.width,
          height: imageInfo.height,
          format: imageInfo.format,
        };

        // Generate thumbnail
        try {
          const thumbnailBuffer = await createThumbnail(buffer);
          const thumbnailFilename = `thumbnails/${canvasId}/${assetId}-thumb.jpg`;
          
          const thumbnailBlob = await put(thumbnailFilename, thumbnailBuffer, {
            access: "public",
            contentType: "image/jpeg",
          });
          
          thumbnailUrl = thumbnailBlob.url;
        } catch (thumbError) {
          console.error("Thumbnail generation failed:", thumbError);
          // Use original as fallback
          thumbnailUrl = url;
        }

        // For images, we could use OCR or AI image captioning in future
        extractedText = "";
        
      } else if (mimeType === "application/pdf") {
        // PDF text extraction
        // Note: In production, use pdf-parse package
        // For now, placeholder
        extractedText = "[PDF content - install pdf-parse for extraction]";
        metadata = { type: "pdf", pages: 0 };
        
      } else if (mimeType.startsWith("text/") || mimeType === "application/json") {
        // Text file extraction
        extractedText = buffer.toString("utf-8");
        
        // Parse JSON for structured metadata
        if (mimeType === "application/json") {
          try {
            const jsonContent = JSON.parse(extractedText);
            metadata = { 
              type: "json",
              keys: Object.keys(jsonContent).slice(0, 20),
            };
          } catch {
            metadata = { type: "json", valid: false };
          }
        } else {
          metadata = {
            type: "text",
            lineCount: extractedText.split("\n").length,
            wordCount: extractedText.split(/\s+/).length,
          };
        }
      }

      // Generate embeddings for extracted text
      const embeddingsCreated: string[] = [];
      
      if (extractedText && extractedText.length > 10) {
        const chunks = chunkText(extractedText);
        const vectors: {
          id: string;
          values: number[];
          metadata: VectorMetadata;
        }[] = [];

        for (let i = 0; i < Math.min(chunks.length, 10); i++) { // Limit to 10 chunks
          const cleanedText = prepareTextForEmbedding(chunks[i]);
          if (!cleanedText) continue;

          try {
            const embedding = await generateEmbedding(cleanedText);
            const vectorId = `${canvasId}-asset-${assetId}-chunk-${i}`;

            vectors.push({
              id: vectorId,
              values: embedding,
              metadata: {
                canvasId,
                sourceType: "asset",
                sourceId: assetId,
                text: cleanedText.substring(0, 1000),
                userId: "",
                createdAt: new Date().toISOString(),
              },
            });
            
            embeddingsCreated.push(vectorId);
          } catch (embError) {
            console.error(`Failed to generate embedding for chunk ${i}:`, embError);
          }
        }

        if (vectors.length > 0) {
          await upsertVectors(vectors);
          
          // Track embeddings in database
          for (const vector of vectors) {
            await db.embedding.upsert({
              where: { pineconeId: vector.id },
              update: { updatedAt: new Date() },
              create: {
                sourceType: "ASSET",
                sourceId: assetId,
                canvasId,
                pineconeId: vector.id,
                text: vector.metadata.text,
              },
            });
          }
        }
      }

      // Update asset with results
      await db.asset.update({
        where: { id: assetId },
        data: {
          status: "COMPLETED",
          extractedText: extractedText ? extractedText.substring(0, 50000) : null, // Limit stored text
          thumbnailUrl,
          metadata,
          processedAt: new Date(),
        },
      });

      // Log activity
      await db.activity.create({
        data: {
          canvasId,
          userId: (await db.asset.findUnique({ where: { id: assetId } }))?.uploaderId || "system",
          type: "ASSET_UPLOADED",
          data: {
            assetId,
            filename,
            mimeType,
            extractedTextLength: extractedText?.length || 0,
            embeddingsCount: embeddingsCreated.length,
          },
        },
      });

      return {
        success: true,
        assetId,
        extractedTextLength: extractedText?.length || 0,
        thumbnailGenerated: !!thumbnailUrl,
        embeddingsCreated: embeddingsCreated.length,
        metadata,
      };
    } catch (error) {
      console.error(`Failed to process asset ${assetId}:`, error);

      await db.asset.update({
        where: { id: assetId },
        data: { 
          status: "FAILED",
          metadata: { error: error instanceof Error ? error.message : "Unknown error" },
        },
      });

      throw error;
    }
  },
});

// Task: Reprocess failed assets
export const reprocessFailedAssets = task({
  id: "reprocess-failed-assets",
  maxDuration: 600,
  run: async (payload: { canvasId?: string }) => {
    const { canvasId } = payload;

    // Find failed assets
    const failedAssets = await db.asset.findMany({
      where: {
        status: "FAILED",
        ...(canvasId ? { canvasId } : {}),
      },
      take: 20, // Process in batches
    });

    console.log(`Found ${failedAssets.length} failed assets to reprocess`);

    const results: { assetId: string; success: boolean; error?: string }[] = [];

    for (const asset of failedAssets) {
      try {
        // Trigger processing for each asset
        await processAsset.trigger({
          assetId: asset.id,
          canvasId: asset.canvasId,
          url: asset.url,
          mimeType: asset.mimeType,
          filename: asset.filename,
        });

        results.push({ assetId: asset.id, success: true });
      } catch (error) {
        results.push({
          assetId: asset.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      processed: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  },
});

// Task: Clean up orphaned assets (not linked to any canvas)
export const cleanupOrphanedAssets = task({
  id: "cleanup-orphaned-assets",
  maxDuration: 300,
  run: async () => {
    // Find assets where canvas was deleted
    // This would be orphaned assets
    // For now, just log what would be deleted

    const assetsToCleanup = await db.asset.findMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Older than 7 days
        },
        status: "FAILED",
      },
      take: 100,
    });

    console.log(`Found ${assetsToCleanup.length} assets to potentially cleanup`);

    // In production, would delete from Vercel Blob and database
    // For safety, just return the count for now

    return {
      foundForCleanup: assetsToCleanup.length,
      message: "Dry run - no assets deleted",
    };
  },
});
