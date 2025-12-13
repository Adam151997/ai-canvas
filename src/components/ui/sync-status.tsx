"use client";

import { WifiOff, RefreshCw, Cloud, CloudOff } from "lucide-react";
import { useSyncStatus } from "@/lib/offline";

interface SyncStatusBadgeProps {
  showPendingCount?: boolean;
}

export function SyncStatusBadge({ showPendingCount = true }: SyncStatusBadgeProps) {
  const { status, isOnline, pendingCount, forceSync, isSyncing } = useSyncStatus();

  // Don't show anything if online and no pending
  if (isOnline && pendingCount === 0 && status === "idle") {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400">
          <WifiOff className="h-2.5 w-2.5" />
          <span>Offline</span>
        </div>
      )}

      {/* Syncing indicator */}
      {isSyncing && (
        <div className="flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
          <RefreshCw className="h-2.5 w-2.5 animate-spin" />
          <span>Syncing</span>
        </div>
      )}

      {/* Pending changes */}
      {showPendingCount && pendingCount > 0 && !isSyncing && (
        <button
          onClick={forceSync}
          disabled={!isOnline}
          className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
        >
          <Cloud className="h-2.5 w-2.5" />
          <span>{pendingCount}</span>
        </button>
      )}

      {/* Error indicator */}
      {status === "error" && (
        <button
          onClick={forceSync}
          className="flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[9px] font-medium text-destructive hover:bg-destructive/20"
        >
          <CloudOff className="h-2.5 w-2.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}

// Compact connection banner
export function ConnectionBanner() {
  const { isOnline, pendingCount, forceSync, isSyncing } = useSyncStatus();

  if (isOnline && pendingCount === 0) return null;

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9998] bg-amber-500 px-3 py-1 text-center text-[10px] font-medium text-white">
        <div className="flex items-center justify-center gap-1.5">
          <WifiOff className="h-3 w-3" />
          <span>Offline - changes will sync when reconnected</span>
          {pendingCount > 0 && (
            <span className="rounded bg-amber-600 px-1.5 py-0.5 text-[9px]">{pendingCount}</span>
          )}
        </div>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9998] bg-primary px-3 py-1 text-center text-[10px] font-medium text-white">
        <div className="flex items-center justify-center gap-1.5">
          {isSyncing ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Syncing {pendingCount}...</span>
            </>
          ) : (
            <>
              <Cloud className="h-3 w-3" />
              <span>{pendingCount} pending</span>
              <button onClick={forceSync} className="ml-1 rounded bg-white/20 px-1.5 py-0.5 hover:bg-white/30">
                Sync
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
