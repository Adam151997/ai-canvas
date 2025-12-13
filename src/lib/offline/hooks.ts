"use client";

import { useState, useEffect, useCallback } from "react";
import { syncManager, type SyncStatus } from "./sync-manager";
import { offlineCanvasOps, mutationQueue, type OfflineCanvas, type OfflineMutation } from "./db";

// Hook for sync status
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Get initial status
    const initialStatus = syncManager.getStatus();
    setStatus(initialStatus.status);
    setIsOnline(initialStatus.isOnline);

    // Update pending count
    const updatePendingCount = async () => {
      const pending = await mutationQueue.getPending();
      setPendingCount(pending.length);
    };
    updatePendingCount();

    // Listen for status changes
    const handleStatusChange = (data: { status: SyncStatus; isOnline: boolean }) => {
      setStatus(data.status);
      setIsOnline(data.isOnline);
    };

    const handleSyncComplete = () => {
      updatePendingCount();
    };

    const handleMutationSynced = () => {
      updatePendingCount();
    };

    syncManager.on("statusChange", handleStatusChange);
    syncManager.on("syncComplete", handleSyncComplete);
    syncManager.on("mutationSynced", handleMutationSynced);

    // Start auto-sync
    syncManager.startAutoSync();

    return () => {
      syncManager.off("statusChange", handleStatusChange);
      syncManager.off("syncComplete", handleSyncComplete);
      syncManager.off("mutationSynced", handleMutationSynced);
    };
  }, []);

  const forceSync = useCallback(() => {
    syncManager.sync();
  }, []);

  return {
    status,
    isOnline,
    pendingCount,
    forceSync,
    isSyncing: status === "syncing",
    hasError: status === "error",
  };
}

// Hook for offline canvas operations
export function useOfflineCanvas(canvasId: string) {
  const [localCanvas, setLocalCanvas] = useState<OfflineCanvas | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load canvas from IndexedDB
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const canvas = await offlineCanvasOps.get(canvasId);
      setLocalCanvas(canvas || null);
      setIsLoading(false);
    };
    load();
  }, [canvasId]);

  // Save canvas locally
  const saveLocal = useCallback(
    async (data: { name?: string; snapshotData?: string; thumbnailUrl?: string }) => {
      if (!localCanvas) return;

      const updated = {
        ...localCanvas,
        ...data,
      };

      await offlineCanvasOps.save(updated);
      setLocalCanvas({ ...updated, isDirty: true, updatedAt: Date.now() });

      // Queue mutation for sync
      await syncManager.queueMutation(canvasId, "UPDATE", data);
    },
    [canvasId, localCanvas]
  );

  // Save snapshot (debounced externally)
  const saveSnapshot = useCallback(
    async (snapshotData: string) => {
      await saveLocal({ snapshotData });
    },
    [saveLocal]
  );

  return {
    localCanvas,
    isLoading,
    saveLocal,
    saveSnapshot,
    isDirty: localCanvas?.isDirty ?? false,
  };
}

// Hook to initialize offline canvas from server data
export function useInitOfflineCanvas() {
  const initCanvas = useCallback(
    async (canvas: { id: string; name: string; ownerId: string; snapshotData?: any }) => {
      // Check if already exists
      const existing = await offlineCanvasOps.get(canvas.id);
      
      if (!existing) {
        await offlineCanvasOps.save({
          id: canvas.id,
          name: canvas.name,
          ownerId: canvas.ownerId,
          snapshotData: canvas.snapshotData ? JSON.stringify(canvas.snapshotData) : "{}",
        });
      }
    },
    []
  );

  return { initCanvas };
}

// Hook for pending mutations
export function usePendingMutations(canvasId?: string) {
  const [mutations, setMutations] = useState<OfflineMutation[]>([]);

  useEffect(() => {
    const load = async () => {
      const pending = canvasId
        ? await mutationQueue.getForCanvas(canvasId)
        : await mutationQueue.getPending();
      setMutations(pending);
    };

    load();

    // Refresh when mutations change
    const handleChange = () => load();
    syncManager.on("mutationSynced", handleChange);
    syncManager.on("syncComplete", handleChange);

    return () => {
      syncManager.off("mutationSynced", handleChange);
      syncManager.off("syncComplete", handleChange);
    };
  }, [canvasId]);

  return mutations;
}
