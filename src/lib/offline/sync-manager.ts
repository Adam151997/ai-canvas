"use client";

import { db, mutationQueue, offlineCanvasOps, offlineAssetOps, type OfflineMutation } from "./db";

// Sync status
export type SyncStatus = "idle" | "syncing" | "error" | "offline";

// Event types for sync manager
type SyncEventType = "statusChange" | "syncComplete" | "syncError" | "mutationSynced";
type SyncEventListener = (data: any) => void;

class SyncManager {
  private status: SyncStatus = "idle";
  private isOnline: boolean = true;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Map<SyncEventType, Set<SyncEventListener>> = new Map();
  private maxRetries = 3;
  private syncIntervalMs = 30000; // 30 seconds

  constructor() {
    if (typeof window !== "undefined") {
      this.isOnline = navigator.onLine;
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }
  }

  // Event handling
  on(event: SyncEventType, listener: SyncEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: SyncEventType, listener: SyncEventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: SyncEventType, data?: any): void {
    this.listeners.get(event)?.forEach((listener) => listener(data));
  }

  // Online/offline handlers
  private handleOnline = (): void => {
    this.isOnline = true;
    this.emit("statusChange", { status: "idle", isOnline: true });
    // Trigger sync when back online
    this.sync();
  };

  private handleOffline = (): void => {
    this.isOnline = false;
    this.status = "offline";
    this.emit("statusChange", { status: "offline", isOnline: false });
  };

  // Get current status
  getStatus(): { status: SyncStatus; isOnline: boolean } {
    return { status: this.status, isOnline: this.isOnline };
  }

  // Start automatic sync
  startAutoSync(): void {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.status !== "syncing") {
        this.sync();
      }
    }, this.syncIntervalMs);

    // Initial sync
    if (this.isOnline) {
      this.sync();
    }
  }

  // Stop automatic sync
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Main sync function
  async sync(): Promise<void> {
    if (!this.isOnline || this.status === "syncing") {
      return;
    }

    this.status = "syncing";
    this.emit("statusChange", { status: "syncing", isOnline: true });

    try {
      // Sync pending mutations
      await this.syncMutations();

      // Sync pending asset uploads
      await this.syncAssets();

      this.status = "idle";
      this.emit("statusChange", { status: "idle", isOnline: true });
      this.emit("syncComplete", { timestamp: Date.now() });
    } catch (error) {
      console.error("Sync error:", error);
      this.status = "error";
      this.emit("statusChange", { status: "error", isOnline: true });
      this.emit("syncError", { error });
    }
  }

  // Sync pending mutations
  private async syncMutations(): Promise<void> {
    const pendingMutations = await mutationQueue.getPending();

    for (const mutation of pendingMutations) {
      if (mutation.retries >= this.maxRetries) {
        await mutationQueue.updateStatus(mutation.id!, "FAILED", "Max retries exceeded");
        continue;
      }

      try {
        await mutationQueue.updateStatus(mutation.id!, "SYNCING");
        await this.processMutation(mutation);
        await mutationQueue.delete(mutation.id!);
        this.emit("mutationSynced", { mutation });
      } catch (error) {
        console.error("Failed to sync mutation:", error);
        await mutationQueue.incrementRetry(mutation.id!);
        await mutationQueue.updateStatus(
          mutation.id!, 
          "PENDING", 
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }
  }

  // Process a single mutation
  private async processMutation(mutation: OfflineMutation): Promise<void> {
    const payload = JSON.parse(mutation.payload);

    switch (mutation.type) {
      case "CREATE":
        await fetch("/api/canvas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        break;

      case "UPDATE":
        await fetch(`/api/canvas/${mutation.canvasId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        break;

      case "DELETE":
        await fetch(`/api/canvas/${mutation.canvasId}`, {
          method: "DELETE",
        });
        break;
    }

    // Mark canvas as synced
    await offlineCanvasOps.markSynced(mutation.canvasId);
  }

  // Sync pending asset uploads
  private async syncAssets(): Promise<void> {
    const pendingAssets = await offlineAssetOps.getPendingUploads();

    for (const asset of pendingAssets) {
      if (!asset.blob) continue;

      try {
        await offlineAssetOps.updateStatus(asset.id, "UPLOADING");

        // Create form data
        const formData = new FormData();
        formData.append("file", asset.blob, asset.filename);
        formData.append("canvasId", asset.canvasId);

        // Upload to API
        const response = await fetch("/api/assets/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const data = await response.json();
        await offlineAssetOps.updateStatus(asset.id, "UPLOADED", data.url);

        // Clear blob from IndexedDB to save space
        await db.assets.update(asset.id, { blob: undefined });
      } catch (error) {
        console.error("Failed to upload asset:", error);
        await offlineAssetOps.updateStatus(asset.id, "PENDING");
      }
    }
  }

  // Queue a mutation for later sync
  async queueMutation(
    canvasId: string,
    type: OfflineMutation["type"],
    payload: any
  ): Promise<void> {
    await mutationQueue.add({
      canvasId,
      type,
      payload: JSON.stringify(payload),
    });

    // Try to sync immediately if online
    if (this.isOnline && this.status === "idle") {
      this.sync();
    }
  }

  // Queue an asset for upload
  async queueAssetUpload(
    id: string,
    canvasId: string,
    file: File
  ): Promise<void> {
    await offlineAssetOps.save({
      id,
      canvasId,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      blob: file,
      uploadStatus: "PENDING",
    });

    // Try to sync immediately if online
    if (this.isOnline && this.status === "idle") {
      this.sync();
    }
  }

  // Cleanup
  destroy(): void {
    this.stopAutoSync();
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }
  }
}

// Singleton instance
export const syncManager = new SyncManager();
