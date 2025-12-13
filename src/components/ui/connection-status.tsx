"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useStatus, useLostConnectionListener } from "@/components/liveblocks/liveblocks.config";

type ConnectionState = "connected" | "disconnected" | "reconnecting";

export function ConnectionStatus() {
  const [showStatus, setShowStatus] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connected");
  const [isOnline, setIsOnline] = useState(true);
  
  // Liveblocks connection status
  const status = useStatus();

  // Track browser online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Update connection state based on Liveblocks status and browser state
  useEffect(() => {
    if (!isOnline) {
      setConnectionState("disconnected");
      setShowStatus(true);
    } else if (status === "connected") {
      setConnectionState("connected");
      // Hide after 2 seconds when connected
      setTimeout(() => setShowStatus(false), 2000);
    } else if (status === "connecting" || status === "reconnecting") {
      setConnectionState("reconnecting");
      setShowStatus(true);
    } else {
      setConnectionState("disconnected");
      setShowStatus(true);
    }
  }, [status, isOnline]);

  // Handle lost connection events
  useLostConnectionListener((event) => {
    if (event === "lost") {
      setConnectionState("disconnected");
      setShowStatus(true);
    } else if (event === "restored") {
      setConnectionState("connected");
      setTimeout(() => setShowStatus(false), 2000);
    } else if (event === "failed") {
      setConnectionState("disconnected");
      setShowStatus(true);
    }
  });

  if (!showStatus) return null;

  return (
    <div
      className={`connection-status ${connectionState === "connected" ? "online" : connectionState === "reconnecting" ? "reconnecting" : "offline"}`}
    >
      <div className="flex items-center gap-2">
        {connectionState === "connected" && (
          <>
            <Wifi className="h-4 w-4" />
            <span>Connected</span>
          </>
        )}
        {connectionState === "disconnected" && (
          <>
            <WifiOff className="h-4 w-4" />
            <span>Offline - Changes will sync when reconnected</span>
          </>
        )}
        {connectionState === "reconnecting" && (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Reconnecting...</span>
          </>
        )}
      </div>
    </div>
  );
}

// Simple version without Liveblocks (for use outside Room)
export function SimpleConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 2000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);
    setShowStatus(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showStatus) return null;

  return (
    <div className={`connection-status ${isOnline ? "online" : "offline"}`}>
      <div className="flex items-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span>Back online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>You're offline</span>
          </>
        )}
      </div>
    </div>
  );
}
