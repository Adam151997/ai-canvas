import { Pinecone, RecordMetadata } from "@pinecone-database/pinecone";

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Get the index
export const getIndex = () => {
  return pinecone.index(process.env.PINECONE_INDEX_NAME || "ai-canvas");
};

// Types for vector operations - extends RecordMetadata for Pinecone compatibility
export interface VectorMetadata extends RecordMetadata {
  canvasId: string;
  sourceType: "comment" | "asset" | "region" | "shape_text";
  sourceId: string;
  text: string;
  userId?: string;
  createdAt: string;
}

// Upsert vectors to Pinecone
export async function upsertVectors(
  vectors: {
    id: string;
    values: number[];
    metadata: VectorMetadata;
  }[]
) {
  const index = getIndex();
  
  // Pinecone recommends batches of 100
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.upsert(batch);
  }
}

// Query similar vectors
export async function querySimilar(
  embedding: number[],
  options: {
    canvasId?: string;
    sourceType?: VectorMetadata["sourceType"];
    topK?: number;
  } = {}
) {
  const index = getIndex();
  
  const filter: Record<string, string> = {};
  if (options.canvasId) {
    filter.canvasId = options.canvasId;
  }
  if (options.sourceType) {
    filter.sourceType = options.sourceType;
  }

  const results = await index.query({
    vector: embedding,
    topK: options.topK || 10,
    includeMetadata: true,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
  });

  return results.matches || [];
}

// Delete vectors by filter
export async function deleteVectors(filter: {
  canvasId?: string;
  sourceId?: string;
}) {
  const index = getIndex();
  
  if (filter.sourceId) {
    await index.deleteOne(filter.sourceId);
  } else if (filter.canvasId) {
    // Delete all vectors for a canvas
    await index.deleteMany({ canvasId: filter.canvasId });
  }
}

// Delete all vectors for a canvas
export async function deleteCanvasVectors(canvasId: string) {
  const index = getIndex();
  await index.deleteMany({ canvasId });
}

export { pinecone };
