"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Canvas } from "@/components/canvas/canvas";
import { Room } from "@/components/liveblocks/room";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface CanvasData {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  roomId: string;
  owner: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export default function CanvasPage() {
  const params = useParams();
  const router = useRouter();
  const canvasId = params.canvasId as string;
  
  const [canvas, setCanvas] = useState<CanvasData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initCanvas = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/canvas/${canvasId}`);
        
        if (response.ok) {
          const data = await response.json();
          setCanvas(data.canvas);
        } else if (response.status === 404) {
          const createResponse = await fetch("/api/canvas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Untitled Canvas", id: canvasId }),
          });

          if (createResponse.ok) {
            const data = await createResponse.json();
            setCanvas(data.canvas);
          } else {
            throw new Error("Failed to create canvas");
          }
        } else {
          throw new Error("Failed to load canvas");
        }
      } catch (err) {
        console.error("Canvas init error:", err);
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    };

    initCanvas();
  }, [canvasId]);

  const updateCanvasName = async (newName: string) => {
    if (!canvas) return;
    try {
      const response = await fetch(`/api/canvas/${canvasId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (response.ok) {
        setCanvas((prev) => prev ? { ...prev, name: newName } : null);
      }
    } catch (err) {
      console.error("Failed to update canvas name:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-xs text-muted-foreground">Loading canvas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-base font-semibold text-foreground mb-1">Unable to load canvas</h1>
          <p className="text-xs text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Link
              href="/canvas"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!canvas) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-base font-semibold text-foreground mb-1">Canvas not found</h1>
          <Link href="/canvas" className="text-xs text-primary hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      {/* Compact Top Bar */}
      <div className="h-10 border-b border-border bg-card/80 backdrop-blur-md px-3 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-2">
          <Link
            href="/canvas"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="text-xs">Back</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <input
            type="text"
            value={canvas.name}
            onChange={(e) => setCanvas((prev) => prev ? { ...prev, name: e.target.value } : null)}
            onBlur={(e) => updateCanvasName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            className="text-sm font-medium text-foreground bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-ring rounded px-1.5 py-0.5 -ml-1"
          />
        </div>
        <span className="text-[10px] text-muted-foreground">by {canvas.owner.name}</span>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative">
        <Room roomId={canvas.roomId}>
          <Canvas canvasId={canvasId} canvasName={canvas.name} />
        </Room>
      </div>
    </div>
  );
}
