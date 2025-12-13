"use client";

import { useState, useEffect } from "react";
import { X, Clock, ArrowRight, Loader2 } from "lucide-react";

interface ShapeHistoryProps {
  shapeId: string;
  canvasId: string;
  onClose: () => void;
  position: { x: number; y: number };
}

interface ShapeChange {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  userColor: string;
  changeType: "created" | "modified" | "styled" | "moved" | "deleted";
  before?: string;
  after?: string;
}

function getUserColor(userId: string): string {
  const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#84cc16"];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function getChangeLabel(type: ShapeChange["changeType"]): string {
  switch (type) {
    case "created": return "Created";
    case "modified": return "Edited";
    case "styled": return "Styled";
    case "moved": return "Moved";
    case "deleted": return "Deleted";
    default: return "Modified";
  }
}

function mapActivityToChangeType(activityType: string): ShapeChange["changeType"] {
  switch (activityType) {
    case "SHAPE_CREATED": return "created";
    case "SHAPE_UPDATED": return "modified";
    case "SHAPE_DELETED": return "deleted";
    default: return "modified";
  }
}

export function ShapeHistory({ shapeId, canvasId, onClose, position }: ShapeHistoryProps) {
  const [history, setHistory] = useState<ShapeChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/canvas/${canvasId}/history?shapeId=${shapeId}&limit=20`);
        if (response.ok) {
          const data = await response.json();
          const changes: ShapeChange[] = (data.history || []).map((activity: any) => ({
            id: activity.id,
            timestamp: new Date(activity.timestamp).getTime(),
            userId: activity.userId,
            userName: activity.user?.name || "Unknown",
            userColor: getUserColor(activity.userId),
            changeType: mapActivityToChangeType(activity.type),
            before: activity.data?.before,
            after: activity.data?.after,
          }));
          setHistory(changes);
        }
      } catch (error) {
        console.error("Failed to fetch shape history:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [shapeId, canvasId]);

  return (
    <div
      className="fixed z-[250] w-56 rounded-lg border border-border bg-card/95 backdrop-blur-md shadow-xl animate-fade-in"
      style={{
        left: Math.min(position.x, window.innerWidth - 240),
        top: Math.min(position.y, window.innerHeight - 300),
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-cyan-500" />
          <span className="text-[10px] font-medium text-foreground">Shape History</span>
        </div>
        <button
          onClick={onClose}
          className="p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* List */}
      <div className="max-h-52 overflow-y-auto p-1.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <div className="py-6 text-center">
            <Clock className="mx-auto h-5 w-5 text-muted-foreground/50 mb-1" />
            <p className="text-[9px] text-muted-foreground">No history</p>
          </div>
        ) : (
          history.map((change, index) => (
            <div key={change.id} className="relative">
              {index < history.length - 1 && (
                <div className="absolute left-[9px] top-6 h-full w-px bg-border" />
              )}
              <div className="flex gap-2 pb-2.5">
                <div
                  className="relative z-10 h-[18px] w-[18px] shrink-0 rounded-full text-[8px] font-medium text-white flex items-center justify-center"
                  style={{ backgroundColor: change.userColor }}
                >
                  {change.userName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-foreground truncate">{change.userName}</span>
                    <span className="text-[8px] text-muted-foreground">{formatTimeAgo(change.timestamp)}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground">{getChangeLabel(change.changeType)}</p>
                  {change.before && change.after && (
                    <div className="mt-1 rounded bg-muted/50 px-1.5 py-1 text-[8px] flex items-center gap-1">
                      <span className="line-through text-red-400 truncate max-w-[50px]">{change.before}</span>
                      <ArrowRight className="h-2 w-2 text-muted-foreground shrink-0" />
                      <span className="text-green-500 truncate max-w-[50px]">{change.after}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
