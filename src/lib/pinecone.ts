// Pinecone vector database has been removed
// This file is kept as a placeholder for future vector database implementation

export interface VectorMetadata {
  canvasId: string;
  sourceType: string; // "comment" | "asset" | "region" | "shape_text"
  sourceId: string;
  text: string;
  userId: string;
  createdAt: string;
  [key: string]: string;
}

// Upsert vectors to Pinecone (placeholder)
export async function upsertVectors(
  vectors: {
    id: string;
    values: number[];
    metadata: VectorMetadata;
  }[]
) {
  console.warn("Pinecone vector database has been removed. Vectors cannot be stored.");
  return;
}

// Query similar vectors (placeholder)
export async function querySimilar(
  embedding: number[],
  options: {
    canvasId?: string;
    sourceType?: string;
    topK?: number;
  } = {}
) {
  console.warn("Pinecone vector database has been removed. Semantic search is disabled.");
  return [];
}

// Delete vectors by filter (placeholder)
export async function deleteVectors(filter: {
  canvasId?: string;
  sourceId?: string;
}) {
  console.warn("Pinecone vector database has been removed. Vectors cannot be deleted.");
  return;
}

// Delete all vectors for a canvas (placeholder)
export async function deleteCanvasVectors(canvasId: string) {
  console.warn("Pinecone vector database has been removed. Vectors cannot be deleted.");
  return;
}
