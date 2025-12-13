"use client";

import { ReactNode } from "react";
import { RoomProvider, defaultPresence } from "./liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";

interface RoomProps {
  roomId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

// Loading component while room is connecting
function RoomLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
        <p className="text-sm text-gray-500">Connecting to canvas...</p>
      </div>
    </div>
  );
}

export function Room({ roomId, children, fallback }: RoomProps) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={defaultPresence}
      initialStorage={{
        canvasName: "Untitled Canvas",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }}
    >
      <ClientSideSuspense fallback={fallback || <RoomLoading />}>
        {children}
      </ClientSideSuspense>
    </RoomProvider>
  );
}
