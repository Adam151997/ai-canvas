"use client";

import { useState, useEffect, useCallback } from "react";

export interface HistoryEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: string;
  shapeId?: string;
  data?: any;
  snapshotBefore?: any;
  snapshotAfter?: any;
}

export interface Bookmark {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  description: string;
  snapshot?: any;
}

interface UseCanvasHistoryOptions {
  canvasId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseCanvasHistoryReturn {
  history: HistoryEntry[];
  bookmarks: Bookmark[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  createBookmark: (description: string, snapshot?: any) => Promise<Bookmark | null>;
  removeBookmark: (activityId: string) => Promise<boolean>;
  getShapeHistory: (shapeId: string) => Promise<HistoryEntry[]>;
  restoreSnapshot: (activityId: string) => Promise<boolean>;
  logActivity: (type: string, data?: any, shapeId?: string) => Promise<void>;
}

export function useCanvasHistory({
  canvasId,
  autoRefresh = false,
  refreshInterval = 30000,
}: UseCanvasHistoryOptions): UseCanvasHistoryReturn {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Fetch history
  const fetchHistory = useCallback(
    async (cursor?: string) => {
      try {
        const url = new URL(`/api/canvas/${canvasId}/history`, window.location.origin);
        url.searchParams.set("limit", "50");
        if (cursor) {
          url.searchParams.set("before", cursor);
        }

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Failed to fetch history");

        const data = await response.json();
        return data;
      } catch (err) {
        console.error("Error fetching history:", err);
        throw err;
      }
    },
    [canvasId]
  );

  // Fetch bookmarks
  const fetchBookmarks = useCallback(async () => {
    try {
      const response = await fetch(`/api/canvas/${canvasId}/bookmarks`);
      if (!response.ok) throw new Error("Failed to fetch bookmarks");

      const data = await response.json();
      return data.bookmarks || [];
    } catch (err) {
      console.error("Error fetching bookmarks:", err);
      return [];
    }
  }, [canvasId]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [historyData, bookmarksData] = await Promise.all([
          fetchHistory(),
          fetchBookmarks(),
        ]);

        setHistory(historyData.history || []);
        setNextCursor(historyData.nextCursor);
        setBookmarks(bookmarksData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [canvasId, fetchHistory, fetchBookmarks]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      try {
        const data = await fetchHistory();
        setHistory(data.history || []);
        setNextCursor(data.nextCursor);
      } catch (err) {
        // Silent fail for auto-refresh
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchHistory]);

  // Load more history
  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoading) return;

    setIsLoading(true);
    try {
      const data = await fetchHistory(nextCursor);
      setHistory((prev) => [...prev, ...(data.history || [])]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setIsLoading(false);
    }
  }, [nextCursor, isLoading, fetchHistory]);

  // Refresh all data
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [historyData, bookmarksData] = await Promise.all([
        fetchHistory(),
        fetchBookmarks(),
      ]);

      setHistory(historyData.history || []);
      setNextCursor(historyData.nextCursor);
      setBookmarks(bookmarksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setIsLoading(false);
    }
  }, [fetchHistory, fetchBookmarks]);

  // Create bookmark
  const createBookmark = useCallback(
    async (description: string, snapshot?: any): Promise<Bookmark | null> => {
      try {
        const response = await fetch(`/api/canvas/${canvasId}/bookmarks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description, snapshot }),
        });

        if (!response.ok) throw new Error("Failed to create bookmark");

        const data = await response.json();
        const newBookmark = data.bookmark;

        setBookmarks((prev) => [newBookmark, ...prev]);
        return newBookmark;
      } catch (err) {
        console.error("Error creating bookmark:", err);
        return null;
      }
    },
    [canvasId]
  );

  // Remove bookmark
  const removeBookmark = useCallback(
    async (activityId: string): Promise<boolean> => {
      try {
        const response = await fetch(
          `/api/canvas/${canvasId}/bookmarks?activityId=${activityId}`,
          { method: "DELETE" }
        );

        if (!response.ok) throw new Error("Failed to remove bookmark");

        setBookmarks((prev) => prev.filter((b) => b.id !== activityId));
        return true;
      } catch (err) {
        console.error("Error removing bookmark:", err);
        return false;
      }
    },
    [canvasId]
  );

  // Get shape-specific history
  const getShapeHistory = useCallback(
    async (shapeId: string): Promise<HistoryEntry[]> => {
      try {
        const url = new URL(`/api/canvas/${canvasId}/history`, window.location.origin);
        url.searchParams.set("shapeId", shapeId);
        url.searchParams.set("limit", "20");

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Failed to fetch shape history");

        const data = await response.json();
        return data.history || [];
      } catch (err) {
        console.error("Error fetching shape history:", err);
        return [];
      }
    },
    [canvasId]
  );

  // Restore snapshot (time travel)
  const restoreSnapshot = useCallback(
    async (activityId: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/canvas/${canvasId}/snapshot`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityId }),
        });

        if (!response.ok) throw new Error("Failed to restore snapshot");

        // Refresh history after restore
        await refresh();
        return true;
      } catch (err) {
        console.error("Error restoring snapshot:", err);
        return false;
      }
    },
    [canvasId, refresh]
  );

  // Log new activity
  const logActivity = useCallback(
    async (type: string, data?: any, shapeId?: string): Promise<void> => {
      try {
        await fetch(`/api/canvas/${canvasId}/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, data, shapeId }),
        });
      } catch (err) {
        console.error("Error logging activity:", err);
      }
    },
    [canvasId]
  );

  return {
    history,
    bookmarks,
    isLoading,
    error,
    hasMore: !!nextCursor,
    loadMore,
    refresh,
    createBookmark,
    removeBookmark,
    getShapeHistory,
    restoreSnapshot,
    logActivity,
  };
}
