"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Image,
  FileText,
  Upload,
  X,
  Trash2,
  Download,
  Loader2,
  FolderOpen,
  File,
  AlertCircle,
} from "lucide-react";

interface Asset {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  status: string;
  createdAt: string;
  uploader?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

interface AssetLibraryProps {
  canvasId: string;
  onClose: () => void;
  onInsertAsset?: (asset: Asset) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType === "application/pdf") return FileText;
  return File;
}

export function AssetLibrary({ canvasId, onClose, onInsertAsset }: AssetLibraryProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/assets?canvasId=${canvasId}`);
      if (!response.ok) throw new Error("Failed to load assets");
      const data = await response.json();
      setAssets(data.assets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assets");
    } finally {
      setIsLoading(false);
    }
  }, [canvasId]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    let completed = 0;
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("canvasId", canvasId);
        const response = await fetch("/api/assets/upload", { method: "POST", body: formData });
        if (!response.ok) throw new Error("Upload failed");
        completed++;
        setUploadProgress((completed / files.length) * 100);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    }
    setIsUploading(false);
    loadAssets();
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm("Delete this asset?")) return;
    try {
      const response = await fetch(`/api/assets?id=${assetId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  }, [canvasId]);

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[70vh] rounded-xl bg-card border border-border shadow-xl flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Assets</span>
            <span className="text-[10px] text-muted-foreground">({assets.length})</span>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Upload Area */}
        <div
          className="mx-3 mt-3 rounded-lg border border-dashed border-border p-4 text-center hover:border-primary/50 hover:bg-accent/30 transition-colors"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.txt,.md,.json"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          
          {isUploading ? (
            <div className="space-y-1.5">
              <Loader2 className="mx-auto h-5 w-5 text-primary animate-spin" />
              <p className="text-[10px] text-muted-foreground">{Math.round(uploadProgress)}%</p>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Drop files or <button onClick={() => fileInputRef.current?.click()} className="text-primary hover:underline">browse</button>
              </p>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-3 mt-2 flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-[10px] text-destructive">
            <AlertCircle className="h-3 w-3" />
            {error}
          </div>
        )}

        {/* Asset Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-1 text-[10px] text-muted-foreground">No assets</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {assets.map((asset) => {
                const FileIcon = getFileIcon(asset.mimeType);
                const isImage = asset.mimeType.startsWith("image/");

                return (
                  <div key={asset.id} className="group relative rounded-lg border border-border overflow-hidden hover:border-primary/50 transition-all">
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      {isImage ? (
                        <img src={asset.thumbnailUrl || asset.url} alt={asset.filename} className="w-full h-full object-cover" />
                      ) : (
                        <FileIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="p-1.5">
                      <p className="text-[9px] font-medium text-foreground truncate">{asset.filename}</p>
                      <p className="text-[8px] text-muted-foreground">{formatFileSize(asset.size)}</p>
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      {onInsertAsset && (
                        <button
                          onClick={() => onInsertAsset(asset)}
                          className="px-2 py-1 rounded bg-white text-black text-[9px] font-medium hover:bg-gray-100"
                        >
                          Insert
                        </button>
                      )}
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded bg-white/90 text-gray-700 hover:bg-white"
                      >
                        <Download className="h-3 w-3" />
                      </a>
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="p-1.5 rounded bg-destructive text-white hover:bg-destructive/90"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
