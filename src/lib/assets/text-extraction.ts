/**
 * Text extraction utilities for various file types
 * 
 * For production, consider using:
 * - pdf-parse for PDFs
 * - tesseract.js for OCR
 * - mammoth for DOCX
 */

/**
 * Extract text from a plain text file
 */
export function extractTextFromPlainText(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

/**
 * Extract text from a markdown file
 */
export function extractTextFromMarkdown(buffer: Buffer): string {
  const text = buffer.toString("utf-8");
  
  // Remove markdown formatting for plain text extraction
  return text
    .replace(/#{1,6}\s/g, "") // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold
    .replace(/\*([^*]+)\*/g, "$1") // Remove italic
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // Remove code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Convert links to text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // Remove images
    .replace(/^\s*[-*+]\s/gm, "") // Remove list markers
    .replace(/^\s*\d+\.\s/gm, "") // Remove numbered list markers
    .replace(/\n{3,}/g, "\n\n") // Normalize line breaks
    .trim();
}

/**
 * Extract text from JSON file
 */
export function extractTextFromJSON(buffer: Buffer): string {
  try {
    const json = JSON.parse(buffer.toString("utf-8"));
    return extractTextFromObject(json);
  } catch {
    return "";
  }
}

/**
 * Recursively extract text values from an object
 */
function extractTextFromObject(obj: any, depth = 0): string {
  if (depth > 10) return ""; // Prevent infinite recursion
  
  if (typeof obj === "string") {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map((item) => extractTextFromObject(item, depth + 1)).join(" ");
  }
  
  if (typeof obj === "object" && obj !== null) {
    return Object.values(obj)
      .map((value) => extractTextFromObject(value, depth + 1))
      .join(" ");
  }
  
  return "";
}

/**
 * Extract text based on mime type
 */
export function extractText(buffer: Buffer, mimeType: string): string | null {
  switch (mimeType) {
    case "text/plain":
      return extractTextFromPlainText(buffer);
    
    case "text/markdown":
    case "text/x-markdown":
      return extractTextFromMarkdown(buffer);
    
    case "application/json":
      return extractTextFromJSON(buffer);
    
    case "application/pdf":
      // PDF extraction requires a library like pdf-parse
      // Return null to indicate it needs special processing
      return null;
    
    default:
      // For other types, try to extract as plain text if it looks like text
      try {
        const text = buffer.toString("utf-8");
        // Check if it's mostly printable characters
        const printableRatio = text.replace(/[^\x20-\x7E\n\r\t]/g, "").length / text.length;
        if (printableRatio > 0.9) {
          return text;
        }
      } catch {
        // Not text
      }
      return null;
  }
}

/**
 * Chunk text for embedding (respecting token limits)
 * Roughly 4 characters per token for English text
 */
export function chunkTextForEmbedding(
  text: string,
  maxChunkSize = 2000, // ~500 tokens
  overlap = 200
): string[] {
  const chunks: string[] = [];
  
  if (text.length <= maxChunkSize) {
    return [text];
  }
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 <= maxChunkSize) {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        // Keep overlap from previous chunk
        const overlapStart = Math.max(0, currentChunk.length - overlap);
        currentChunk = currentChunk.slice(overlapStart) + "\n\n" + paragraph;
      } else {
        // Paragraph itself is too long, split by sentences
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 <= maxChunkSize) {
            currentChunk += (currentChunk ? " " : "") + sentence;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk);
            }
            currentChunk = sentence;
          }
        }
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}
