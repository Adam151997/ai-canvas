"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, Users, Clock, Loader2, Trash2, RefreshCw } from "lucide-react";

interface CanvasItem {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  updatedAt: string;
  createdAt: string;
  owner: { id: string; name: string; avatarUrl?: string };
  members: { user: { id: string; name: string; avatarUrl?: string } }[];
  _count: { comments: number; assets: number };
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString();
}

export default function CanvasListPage() {
  const router = useRouter();
  const [canvases, setCanvases] = useState<CanvasItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCanvases = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/canvas");
      if (!response.ok) throw new Error("Failed to fetch canvases");
      const data = await response.json();
      setCanvases(data.canvases || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load canvases");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCanvases(); }, []);

  const createNewCanvas = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled Canvas" }),
      });
      if (!response.ok) throw new Error("Failed to create canvas");
      const data = await response.json();
      router.push(`/canvas/${data.canvas.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create canvas");
      setIsCreating(false);
    }
  };

  const deleteCanvas = async (canvasId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this canvas?")) return;
    try {
      const response = await fetch(`/api/canvas/${canvasId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete canvas");
      setCanvases((prev) => prev.filter((c) => c.id !== canvasId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete canvas");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Your Canvases</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time collaboration with AI</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchCanvases}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button 
              onClick={createNewCanvas} 
              disabled={isCreating}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              New Canvas
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Quick Start Banner */}
        <div className="mb-6 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">AI Canvas Features</p>
              <p className="text-xs text-blue-100 mt-0.5">Janitor for auto-organization • Ghost Mode for replay • Real-time collaboration</p>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && canvases.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-3">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">No canvases yet</h3>
            <p className="text-xs text-muted-foreground mb-4">Create your first canvas to get started</p>
            <button 
              onClick={createNewCanvas} 
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Create Canvas
            </button>
          </div>
        )}

        {/* Canvas Grid */}
        {!isLoading && canvases.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Create New Card */}
            <button
              onClick={createNewCanvas}
              disabled={isCreating}
              className="group flex h-36 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card transition-all hover:border-primary/50 hover:bg-accent disabled:opacity-50"
            >
              <div className="rounded-full bg-muted p-3 group-hover:bg-primary/10 transition-colors">
                {isCreating ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
              <span className="mt-2 text-[10px] font-medium text-muted-foreground group-hover:text-primary">
                {isCreating ? "Creating..." : "New Canvas"}
              </span>
            </button>

            {/* Canvases */}
            {canvases.map((canvas) => (
              <div
                key={canvas.id}
                onClick={() => router.push(`/canvas/${canvas.id}`)}
                className="group cursor-pointer overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-md relative"
              >
                {/* Delete */}
                <button
                  onClick={(e) => deleteCanvas(canvas.id, e)}
                  className="absolute top-1.5 right-1.5 z-10 p-1 rounded bg-card/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>

                {/* Thumbnail */}
                <div className="h-20 bg-gradient-to-br from-muted to-accent">
                  {canvas.thumbnail ? (
                    <img src={canvas.thumbnail} alt={canvas.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="grid grid-cols-3 gap-1 opacity-30">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="h-3 w-3 rounded-sm bg-muted-foreground/50" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-2">
                  <h3 className="text-xs font-medium text-foreground group-hover:text-primary truncate transition-colors">
                    {canvas.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTimeAgo(canvas.updatedAt)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Users className="h-2.5 w-2.5" />
                      {canvas.members.length + 1}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
