"use client";

import { useEditor, useValue } from "tldraw";
import { useState, useEffect, useRef, useCallback } from "react";
import { Map, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

export function CanvasMinimap() {
  const editor = useEditor();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Get reactive values from editor
  const camera = useValue("camera", () => editor.getCamera(), [editor]);
  const shapes = useValue("shapes", () => editor.getCurrentPageShapes(), [editor]);
  const viewportBounds = useValue("viewport", () => editor.getViewportScreenBounds(), [editor]);

  // Draw minimap
  const drawMinimap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !editor) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = "rgba(20, 20, 20, 0.9)";
    ctx.fillRect(0, 0, width, height);

    // Get all shapes bounds
    const allShapes = editor.getCurrentPageShapes();
    if (allShapes.length === 0) {
      // Draw empty state
      ctx.fillStyle = "rgba(100, 100, 100, 0.5)";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Empty canvas", width / 2, height / 2);
      return;
    }

    // Calculate bounds of all shapes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const shape of allShapes) {
      const bounds = editor.getShapeGeometry(shape).bounds;
      const pagePoint = editor.getShapePageTransform(shape);
      if (pagePoint) {
        const x = pagePoint.x();
        const y = pagePoint.y();
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + bounds.width);
        maxY = Math.max(maxY, y + bounds.height);
      }
    }

    // Add padding
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;

    // Calculate scale to fit
    const scaleX = (width - 10) / boundsWidth;
    const scaleY = (height - 10) / boundsHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    // Center offset
    const offsetX = (width - boundsWidth * scale) / 2 - minX * scale;
    const offsetY = (height - boundsHeight * scale) / 2 - minY * scale;

    // Draw shapes as dots/rectangles
    for (const shape of allShapes) {
      const bounds = editor.getShapeGeometry(shape).bounds;
      const pagePoint = editor.getShapePageTransform(shape);
      if (!pagePoint) continue;

      const x = pagePoint.x() * scale + offsetX;
      const y = pagePoint.y() * scale + offsetY;
      const w = Math.max(bounds.width * scale, 2);
      const h = Math.max(bounds.height * scale, 2);

      // Color based on shape type
      switch (shape.type) {
        case "text":
          ctx.fillStyle = "#60a5fa"; // blue
          break;
        case "note":
          ctx.fillStyle = "#fbbf24"; // yellow
          break;
        case "draw":
          ctx.fillStyle = "#a78bfa"; // purple
          break;
        case "geo":
          ctx.fillStyle = "#34d399"; // green
          break;
        case "arrow":
          ctx.fillStyle = "#f87171"; // red
          break;
        case "image":
          ctx.fillStyle = "#fb923c"; // orange
          break;
        default:
          ctx.fillStyle = "#9ca3af"; // gray
      }

      ctx.fillRect(x, y, w, h);
    }

    // Draw viewport rectangle
    const viewportScreenBounds = editor.getViewportScreenBounds();
    const viewportPageBounds = editor.getViewportPageBounds();
    
    const vx = viewportPageBounds.x * scale + offsetX;
    const vy = viewportPageBounds.y * scale + offsetY;
    const vw = viewportPageBounds.width * scale;
    const vh = viewportPageBounds.height * scale;

    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.strokeRect(vx, vy, vw, vh);
    
    // Viewport fill
    ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
    ctx.fillRect(vx, vy, vw, vh);
  }, [editor]);

  // Redraw on changes
  useEffect(() => {
    drawMinimap();
  }, [camera, shapes, viewportBounds, drawMinimap]);

  // Handle click on minimap to navigate
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editor || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Get all shapes bounds for coordinate mapping
    const allShapes = editor.getCurrentPageShapes();
    if (allShapes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const shape of allShapes) {
      const bounds = editor.getShapeGeometry(shape).bounds;
      const pagePoint = editor.getShapePageTransform(shape);
      if (pagePoint) {
        const x = pagePoint.x();
        const y = pagePoint.y();
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + bounds.width);
        maxY = Math.max(maxY, y + bounds.height);
      }
    }

    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;

    const scaleX = (canvas.width - 10) / boundsWidth;
    const scaleY = (canvas.height - 10) / boundsHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    const offsetX = (canvas.width - boundsWidth * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - boundsHeight * scale) / 2 - minY * scale;

    // Convert click to page coordinates
    const pageX = (clickX - offsetX) / scale;
    const pageY = (clickY - offsetY) / scale;

    // Center viewport on clicked point
    editor.centerOnPoint({ x: pageX, y: pageY });
  }, [editor]);

  // Zoom controls
  const handleZoomIn = () => editor?.zoomIn();
  const handleZoomOut = () => editor?.zoomOut();
  const handleFitAll = () => editor?.zoomToFit();

  const size = isExpanded ? { width: 200, height: 150 } : { width: 140, height: 100 };

  return (
    <div 
      ref={containerRef}
      className="rounded-lg bg-card/95 backdrop-blur-md border border-border shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/50">
        <div className="flex items-center gap-1">
          <Map className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">Map</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleZoomOut}
            className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="h-3 w-3" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="h-3 w-3" />
          </button>
          <button
            onClick={handleFitAll}
            className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Fit all"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        className="cursor-pointer"
        onClick={handleClick}
      />
    </div>
  );
}
