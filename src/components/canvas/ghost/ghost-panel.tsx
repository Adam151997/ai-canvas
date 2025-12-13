"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  History,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface GhostPanelProps {
  canvasId: string;
  onTimeTravel?: (timestamp: number) => void;
  onCinemaModeStart?: () => void;
}

interface HistoryEntry {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  userColor: string;
  action: string;
  description: string;
  shapeId?: string;
  isBookmarked?: boolean;
}

function getUserColor(userId: string): string {
  const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#84cc16"];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getActionDescription(type: string, data: any): string {
  switch (type) {
    case "SHAPE_CREATED": return data?.action === "created" ? "Created canvas" : "Added shape";
    case "SHAPE_UPDATED": return "Edited";
    case "SHAPE_DELETED": return "Deleted";
    case "COMMENT_ADDED": return "Commented";
    case "ASSET_UPLOADED": return "Uploaded file";
    case "AI_SYNTHESIS": return "AI synthesis";
    case "CANVAS_RENAMED": return `Renamed`;
    default: return type.replace(/_/g, " ").toLowerCase();
  }
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function GhostPanel({ canvasId, onTimeTravel, onCinemaModeStart }: GhostPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showCinemaMode, setShowCinemaMode] = useState(false);
  
  const playbackRef = useRef<NodeJS.Timeout | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/canvas/${canvasId}/history?limit=50`);
      if (response.ok) {
        const data = await response.json();
        const entries: HistoryEntry[] = (data.history || []).map((activity: any) => ({
          id: activity.id,
          timestamp: new Date(activity.timestamp).getTime(),
          userId: activity.userId,
          userName: activity.user?.name || "Unknown",
          userColor: getUserColor(activity.userId),
          action: activity.type,
          description: getActionDescription(activity.type, activity.data),
          shapeId: activity.shapeId,
          isBookmarked: activity.data?.bookmarked || false,
        }));
        setHistory(entries);
        if (entries.length > 0) setCurrentIndex(0);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoading(false);
    }
  }, [canvasId]);

  useEffect(() => {
    if (isOpen && history.length === 0) fetchHistory();
  }, [isOpen, fetchHistory, history.length]);

  useEffect(() => {
    if (isPlaying && history.length > 0) {
      playbackRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= history.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => {
      if (playbackRef.current) clearInterval(playbackRef.current);
    };
  }, [isPlaying, playbackSpeed, history.length]);

  const handleTimeTravel = useCallback((index: number) => {
    setCurrentIndex(index);
    const entry = history[index];
    if (entry) onTimeTravel?.(entry.timestamp);
  }, [history, onTimeTravel]);

  const toggleBookmark = async (entryId: string, isCurrentlyBookmarked: boolean) => {
    try {
      if (isCurrentlyBookmarked) {
        await fetch(`/api/canvas/${canvasId}/bookmarks?activityId=${entryId}`, { method: "DELETE" });
      } else {
        await fetch(`/api/canvas/${canvasId}/bookmarks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityId: entryId }),
        });
      }
      setHistory((prev) =>
        prev.map((entry) => entry.id === entryId ? { ...entry, isBookmarked: !isCurrentlyBookmarked } : entry)
      );
    } catch (error) {
      console.error("Failed to toggle bookmark:", error);
    }
  };

  const startCinemaMode = () => {
    setShowCinemaMode(true);
    setCurrentIndex(history.length - 1);
    setIsPlaying(true);
    onCinemaModeStart?.();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 left-4 z-[200] flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
        title="Ghost Timeline"
      >
        <History className="h-4 w-4" />
      </button>
    );
  }

  // Cinema Mode
  if (showCinemaMode) {
    const currentEntry = history[history.length - 1 - currentIndex];
    const progress = history.length > 0 ? ((currentIndex + 1) / history.length) * 100 : 0;

    return (
      <div className="fixed inset-0 z-[300] bg-background/95 backdrop-blur-sm flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-cyan-500" />
            <span className="text-sm font-medium text-foreground">Cinema Mode</span>
          </div>
          <button
            onClick={() => { setShowCinemaMode(false); setIsPlaying(false); }}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center">
          {currentEntry ? (
            <div className="text-center">
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white text-lg font-medium mb-3"
                style={{ backgroundColor: currentEntry.userColor }}
              >
                {currentEntry.userName.charAt(0)}
              </div>
              <p className="text-lg font-semibold text-foreground">{currentEntry.userName}</p>
              <p className="text-sm text-muted-foreground">{currentEntry.description}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">No history</p>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 space-y-3">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setCurrentIndex(0)} className="p-1.5 text-muted-foreground hover:text-foreground">
              <SkipBack className="h-4 w-4" />
            </button>
            <button onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))} className="p-1.5 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="h-10 w-10 rounded-full bg-cyan-500 text-white flex items-center justify-center hover:bg-cyan-600"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>
            <button onClick={() => setCurrentIndex((p) => Math.min(history.length - 1, p + 1))} className="p-1.5 text-muted-foreground hover:text-foreground">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={() => setCurrentIndex(history.length - 1)} className="p-1.5 text-muted-foreground hover:text-foreground">
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-1">
            {[0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-0.5 text-[10px] rounded ${
                  playbackSpeed === speed ? "bg-cyan-500 text-white" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Regular Panel
  return (
    <div className="fixed bottom-20 left-4 z-[200] w-64 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-xl animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-r from-cyan-500 to-teal-500">
            <History className="h-3 w-3 text-white" />
          </div>
          <span className="text-xs font-semibold text-foreground">Timeline</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={fetchHistory}
            disabled={isLoading}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={startCinemaMode}
            disabled={history.length === 0}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors disabled:opacity-40"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Timeline Slider */}
      {history.length > 0 && (
        <div className="px-3 py-2 border-b border-border">
          <input
            type="range"
            min="0"
            max={Math.max(0, history.length - 1)}
            value={currentIndex}
            onChange={(e) => handleTimeTravel(parseInt(e.target.value))}
            className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
            <span>Oldest</span>
            <span>{currentIndex + 1}/{history.length}</span>
            <span>Latest</span>
          </div>
        </div>
      )}

      {/* History List */}
      <div className="max-h-48 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <div className="py-6 text-center">
            <History className="mx-auto h-6 w-6 text-muted-foreground/50 mb-1" />
            <p className="text-[10px] text-muted-foreground">No activity yet</p>
          </div>
        ) : (
          history.map((entry, index) => (
            <div
              key={entry.id}
              onClick={() => handleTimeTravel(index)}
              className={`flex items-center gap-2 rounded-md p-1.5 cursor-pointer transition-colors ${
                currentIndex === index ? "bg-cyan-500/10" : "hover:bg-accent"
              }`}
            >
              <div
                className="h-5 w-5 shrink-0 rounded-full text-[9px] font-medium text-white flex items-center justify-center"
                style={{ backgroundColor: entry.userColor }}
              >
                {entry.userName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-foreground truncate">{entry.userName}</p>
                <p className="text-[9px] text-muted-foreground truncate">{entry.description}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[9px] text-muted-foreground">{formatTimeAgo(entry.timestamp)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleBookmark(entry.id, entry.isBookmarked || false); }}
                  className={`p-0.5 ${entry.isBookmarked ? "text-amber-500" : "text-muted-foreground/30 hover:text-muted-foreground"}`}
                >
                  <Bookmark className="h-3 w-3" fill={entry.isBookmarked ? "currentColor" : "none"} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-2">
        <button
          onClick={startCinemaMode}
          disabled={history.length === 0}
          className="w-full flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[10px] font-medium text-white bg-gradient-to-r from-cyan-500 to-teal-500 hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          <Play className="h-3 w-3" />
          Cinema Mode
        </button>
      </div>
    </div>
  );
}
