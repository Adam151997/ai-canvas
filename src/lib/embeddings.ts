import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";

// Use Gemini for embeddings
// Note: For production, consider using a dedicated embedding model like text-embedding-004
const embeddingModel = google.textEmbeddingModel("text-embedding-004");

// Generate embedding for a single text
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });
  
  return embedding;
}

// Generate embeddings for multiple texts (batch)
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
  });
  
  return embeddings;
}

// Prepare text for embedding (clean and truncate)
export function prepareTextForEmbedding(text: string, maxLength = 8000): string {
  // Remove excessive whitespace
  let cleaned = text.replace(/\s+/g, " ").trim();
  
  // Truncate if too long (embedding models have token limits)
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength) + "...";
  }
  
  return cleaned;
}

// Chunk text for large documents
export function chunkText(
  text: string,
  chunkSize = 1000,
  overlap = 200
): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  
  return chunks;
}
