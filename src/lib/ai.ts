import { google } from "@ai-sdk/google";
import { generateText, streamText } from "ai";

// Gemini 2.5 Pro model
const model = google("gemini-2.5-pro-preview-06-05");

// Types
export interface SynthesisResult {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  themes: string[];
}

export interface ClusterResult {
  clusters: {
    name: string;
    items: string[];
    description: string;
  }[];
  connections: {
    from: string;
    to: string;
    relationship: string;
  }[];
}

export interface LayoutSuggestion {
  type: "next_step" | "branch" | "connection";
  description: string;
  suggestedText: string;
  position?: { x: number; y: number };
}

// Synthesize/Summarize content
export async function synthesizeContent(
  content: string,
  options: { stream?: boolean } = {}
) {
  const prompt = `You are the "Janitor" AI assistant for a collaborative canvas tool.
Your job is to synthesize and summarize messy content into clear, actionable insights.

Analyze the following content from the canvas and provide:
1. A concise summary (2-3 sentences)
2. Key points (bullet points)
3. Action items (if any)
4. Main themes/topics

Content to analyze:
${content}

Respond in JSON format:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "actionItems": ["...", "..."],
  "themes": ["...", "..."]
}`;

  if (options.stream) {
    return streamText({
      model,
      prompt,
      temperature: 0.7,
      maxTokens: 1024,
    });
  }

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.7,
    maxTokens: 1024,
  });

  try {
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as SynthesisResult;
    }
  } catch (e) {
    console.error("Failed to parse synthesis result:", e);
  }

  return {
    summary: text,
    keyPoints: [],
    actionItems: [],
    themes: [],
  } as SynthesisResult;
}

// Cluster related content
export async function clusterContent(items: string[]): Promise<ClusterResult> {
  const prompt = `You are the "Janitor" AI assistant analyzing canvas content for semantic relationships.

Analyze these items and group them into meaningful clusters:
${items.map((item, i) => `${i + 1}. ${item}`).join("\n")}

Identify:
1. Groups of related items (clusters)
2. Connections between clusters

Respond in JSON format:
{
  "clusters": [
    {
      "name": "Cluster Name",
      "items": ["item 1", "item 2"],
      "description": "What these items have in common"
    }
  ],
  "connections": [
    {
      "from": "Cluster A",
      "to": "Cluster B", 
      "relationship": "Description of how they relate"
    }
  ]
}`;

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.5,
    maxTokens: 2048,
  });

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as ClusterResult;
    }
  } catch (e) {
    console.error("Failed to parse cluster result:", e);
  }

  return { clusters: [], connections: [] };
}

// Suggest layout completions
export async function suggestLayoutCompletion(
  context: string,
  partialDiagram: string
): Promise<LayoutSuggestion[]> {
  const prompt = `You are the "Janitor" AI assistant helping complete a flowchart or diagram.

Context about the project:
${context}

Current diagram state:
${partialDiagram}

Suggest 2-3 logical next steps or branches to complete this diagram.
Consider common patterns (success/failure paths, decision trees, etc.)

Respond in JSON format:
{
  "suggestions": [
    {
      "type": "next_step" | "branch" | "connection",
      "description": "Why this makes sense",
      "suggestedText": "Text for the new element"
    }
  ]
}`;

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.7,
    maxTokens: 1024,
  });

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return result.suggestions || [];
    }
  } catch (e) {
    console.error("Failed to parse layout suggestions:", e);
  }

  return [];
}

// Generate tags/labels for content
export async function generateTags(content: string): Promise<string[]> {
  const prompt = `Analyze this content and generate 3-5 relevant tags/labels.
Keep tags short (1-2 words each).

Content:
${content}

Respond with only a JSON array of strings:
["tag1", "tag2", "tag3"]`;

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.3,
    maxTokens: 100,
  });

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as string[];
    }
  } catch (e) {
    console.error("Failed to parse tags:", e);
  }

  return [];
}

// Detect region topic from content
export async function detectRegionTopic(
  shapeTexts: string[]
): Promise<{ label: string; confidence: number }> {
  const prompt = `Analyze these items from a canvas region and identify the main topic.

Items:
${shapeTexts.join("\n")}

Respond in JSON format:
{
  "label": "Short topic label (2-4 words)",
  "confidence": 0.0 to 1.0
}`;

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.3,
    maxTokens: 100,
  });

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse region topic:", e);
  }

  return { label: "Untitled Region", confidence: 0 };
}
