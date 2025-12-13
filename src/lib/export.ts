import { Editor } from "tldraw";

// Export canvas as PNG image
export async function exportToPNG(editor: Editor): Promise<Blob | null> {
  try {
    const shapeIds = editor.getCurrentPageShapeIds();
    if (shapeIds.size === 0) {
      throw new Error("No shapes to export");
    }

    const blob = await editor.toImage([...shapeIds], {
      format: "png",
      background: true,
      padding: 32,
      scale: 2,
    });

    return blob;
  } catch (error) {
    console.error("Export to PNG failed:", error);
    return null;
  }
}

// Export canvas as SVG
export async function exportToSVG(editor: Editor): Promise<string | null> {
  try {
    const shapeIds = editor.getCurrentPageShapeIds();
    if (shapeIds.size === 0) {
      throw new Error("No shapes to export");
    }

    const svg = await editor.toSvg([...shapeIds], {
      background: true,
      padding: 32,
    });

    return svg?.outerHTML || null;
  } catch (error) {
    console.error("Export to SVG failed:", error);
    return null;
  }
}

// Export canvas content as Markdown
export function exportToMarkdown(editor: Editor): string {
  const shapes = editor.getCurrentPageShapes();
  const lines: string[] = [];

  lines.push("# Canvas Export");
  lines.push("");
  lines.push(`*Exported on ${new Date().toLocaleString()}*`);
  lines.push("");

  // Group shapes by type
  const textShapes: any[] = [];
  const noteShapes: any[] = [];
  const geoShapes: any[] = [];
  const arrowShapes: any[] = [];
  const otherShapes: any[] = [];

  for (const shape of shapes) {
    switch (shape.type) {
      case "text":
        textShapes.push(shape);
        break;
      case "note":
        noteShapes.push(shape);
        break;
      case "geo":
        geoShapes.push(shape);
        break;
      case "arrow":
        arrowShapes.push(shape);
        break;
      default:
        otherShapes.push(shape);
    }
  }

  // Export notes
  if (noteShapes.length > 0) {
    lines.push("## Notes");
    lines.push("");
    for (const shape of noteShapes) {
      const text = (shape.props as any)?.text;
      if (text) {
        lines.push(`- ${text}`);
      }
    }
    lines.push("");
  }

  // Export text
  if (textShapes.length > 0) {
    lines.push("## Text");
    lines.push("");
    for (const shape of textShapes) {
      const text = (shape.props as any)?.text;
      if (text) {
        lines.push(text);
        lines.push("");
      }
    }
  }

  // Export geo shapes with text
  const geoWithText = geoShapes.filter((s) => (s.props as any)?.text);
  if (geoWithText.length > 0) {
    lines.push("## Shapes");
    lines.push("");
    for (const shape of geoWithText) {
      const text = (shape.props as any)?.text;
      const geoType = (shape.props as any)?.geo || "shape";
      lines.push(`- **[${geoType}]** ${text}`);
    }
    lines.push("");
  }

  // Export arrows with labels
  const arrowsWithText = arrowShapes.filter((s) => (s.props as any)?.text);
  if (arrowsWithText.length > 0) {
    lines.push("## Connections");
    lines.push("");
    for (const shape of arrowsWithText) {
      const text = (shape.props as any)?.text;
      lines.push(`- → ${text}`);
    }
    lines.push("");
  }

  // Summary
  lines.push("---");
  lines.push("");
  lines.push(`*Total shapes: ${shapes.length}*`);

  return lines.join("\n");
}

// Export canvas data as JSON (for backup/restore)
export function exportToJSON(editor: Editor): string {
  const snapshot = editor.store.getSnapshot();
  return JSON.stringify(snapshot, null, 2);
}

// Import canvas data from JSON
export function importFromJSON(editor: Editor, json: string): boolean {
  try {
    const snapshot = JSON.parse(json);
    editor.store.loadSnapshot(snapshot);
    return true;
  } catch (error) {
    console.error("Import from JSON failed:", error);
    return false;
  }
}

// Download helper
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Download text file
export function downloadText(content: string, filename: string, mimeType = "text/plain"): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}
