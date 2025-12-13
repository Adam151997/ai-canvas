import Dexie, { type EntityTable } from "dexie";

// Types for offline storage
export interface OfflineCanvas {
  id: string;
  name: string;
  ownerId: string;
  snapshotData: string; // JSON stringified tldraw snapshot
  thumbnailUrl?: string;
  updatedAt: number;
  syncedAt?: number;
  isDirty: boolean;
}

export interface OfflineMutation {
  id?: number;
  canvasId: string;
  type: "CREATE" | "UPDATE" | "DELETE";
  payload: string; // JSON stringified mutation data
  createdAt: number;
  retries: number;
  status: "PENDING" | "SYNCING" | "FAILED";
  error?: string;
}

export interface OfflineAsset {
  id: string;
  canvasId: string;
  filename: string;
  mimeType: string;
  size: number;
  blob?: Blob;
  thumbnailBlob?: Blob;
  uploadStatus: "PENDING" | "UPLOADING" | "UPLOADED" | "FAILED";
  remoteUrl?: string;
  createdAt: number;
}

export interface OfflineSettings {
  key: string;
  value: string;
}

// Define the database
class AICanvasDatabase extends Dexie {
  canvases!: EntityTable<OfflineCanvas, "id">;
  mutations!: EntityTable<OfflineMutation, "id">;
  assets!: EntityTable<OfflineAsset, "id">;
  settings!: EntityTable<OfflineSettings, "key">;

  constructor() {
    super("AICanvasDB");
    
    this.version(1).stores({
      canvases: "id, ownerId, updatedAt, isDirty",
      mutations: "++id, canvasId, status, createdAt",
      assets: "id, canvasId, uploadStatus, createdAt",
      settings: "key",
    });
  }
}

// Create singleton instance
export const db = new AICanvasDatabase();

// Helper functions for canvas operations
export const offlineCanvasOps = {
  // Save canvas locally
  async save(canvas: Omit<OfflineCanvas, "isDirty" | "updatedAt">): Promise<void> {
    await db.canvases.put({
      ...canvas,
      updatedAt: Date.now(),
      isDirty: true,
    });
  },

  // Get canvas by ID
  async get(id: string): Promise<OfflineCanvas | undefined> {
    return db.canvases.get(id);
  },

  // Get all canvases for a user
  async getAllForUser(ownerId: string): Promise<OfflineCanvas[]> {
    return db.canvases.where("ownerId").equals(ownerId).toArray();
  },

  // Get dirty (unsynced) canvases
  async getDirty(): Promise<OfflineCanvas[]> {
    return db.canvases.where("isDirty").equals(1).toArray();
  },

  // Mark canvas as synced
  async markSynced(id: string): Promise<void> {
    await db.canvases.update(id, {
      isDirty: false,
      syncedAt: Date.now(),
    });
  },

  // Delete canvas
  async delete(id: string): Promise<void> {
    await db.canvases.delete(id);
    // Also delete related mutations and assets
    await db.mutations.where("canvasId").equals(id).delete();
    await db.assets.where("canvasId").equals(id).delete();
  },
};

// Helper functions for mutation queue
export const mutationQueue = {
  // Add mutation to queue
  async add(mutation: Omit<OfflineMutation, "id" | "createdAt" | "retries" | "status">): Promise<number> {
    const id = await db.mutations.add({
      ...mutation,
      createdAt: Date.now(),
      retries: 0,
      status: "PENDING",
    });
    // Auto-increment always returns a number, but Dexie types it as possibly undefined
    return id as number;
  },

  // Get pending mutations
  async getPending(): Promise<OfflineMutation[]> {
    return db.mutations.where("status").equals("PENDING").toArray();
  },

  // Get mutations for a canvas
  async getForCanvas(canvasId: string): Promise<OfflineMutation[]> {
    return db.mutations.where("canvasId").equals(canvasId).toArray();
  },

  // Update mutation status
  async updateStatus(id: number, status: OfflineMutation["status"], error?: string): Promise<void> {
    await db.mutations.update(id, { status, error });
  },

  // Increment retry count
  async incrementRetry(id: number): Promise<void> {
    const mutation = await db.mutations.get(id);
    if (mutation) {
      await db.mutations.update(id, { retries: mutation.retries + 1 });
    }
  },

  // Delete mutation
  async delete(id: number): Promise<void> {
    await db.mutations.delete(id);
  },

  // Clear all synced mutations
  async clearSynced(): Promise<void> {
    // Keep failed mutations for retry
    await db.mutations.where("status").equals("SYNCING").delete();
  },
};

// Helper functions for offline assets
export const offlineAssetOps = {
  // Save asset locally
  async save(asset: Omit<OfflineAsset, "createdAt">): Promise<void> {
    await db.assets.put({
      ...asset,
      createdAt: Date.now(),
    });
  },

  // Get asset by ID
  async get(id: string): Promise<OfflineAsset | undefined> {
    return db.assets.get(id);
  },

  // Get pending uploads
  async getPendingUploads(): Promise<OfflineAsset[]> {
    return db.assets.where("uploadStatus").equals("PENDING").toArray();
  },

  // Update upload status
  async updateStatus(id: string, status: OfflineAsset["uploadStatus"], remoteUrl?: string): Promise<void> {
    await db.assets.update(id, { uploadStatus: status, remoteUrl });
  },

  // Delete asset
  async delete(id: string): Promise<void> {
    await db.assets.delete(id);
  },

  // Get assets for canvas
  async getForCanvas(canvasId: string): Promise<OfflineAsset[]> {
    return db.assets.where("canvasId").equals(canvasId).toArray();
  },
};

// Settings helpers
export const offlineSettings = {
  async get(key: string): Promise<string | undefined> {
    const setting = await db.settings.get(key);
    return setting?.value;
  },

  async set(key: string, value: string): Promise<void> {
    await db.settings.put({ key, value });
  },

  async delete(key: string): Promise<void> {
    await db.settings.delete(key);
  },
};
