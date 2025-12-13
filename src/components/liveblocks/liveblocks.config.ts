import { createClient } from "@liveblocks/client";
import { createRoomContext, createLiveblocksContext } from "@liveblocks/react";

// Create the Liveblocks client
const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
  throttle: 100,
});

// Define user presence (cursor position, selected shapes, etc.)
export type Presence = {
  cursor: { x: number; y: number } | null;
  selectedShapes: string[];
  pencilDraft: [x: number, y: number, pressure: number][] | null;
  penColor: string;
  currentPage: string;
};

// Define the storage structure for the room
export type Storage = {
  canvasName: string;
  createdAt: number;
  updatedAt: number;
};

// User info attached to each user
export type UserMeta = {
  id: string;
  info: {
    name: string;
    email: string;
    avatar: string;
    color: string;
  };
};

// Custom room events (for real-time notifications)
export type RoomEvent = 
  | { type: "SHAPE_LOCKED"; shapeId: string; userId: string }
  | { type: "AI_SYNTHESIS_STARTED"; region: string }
  | { type: "AI_SYNTHESIS_COMPLETE"; region: string; resultId: string }
  | { type: "COMMENT_ADDED"; shapeId: string; commentId: string }
  | { type: "NOTIFICATION"; message: string; userId: string };

// Thread metadata for comments
export type ThreadMetadata = {
  shapeId: string;
  x: number;
  y: number;
  resolved: boolean;
};

// Create room context with all type definitions
export const {
  suspense: {
    RoomProvider,
    useRoom,
    useMyPresence,
    useUpdateMyPresence,
    useSelf,
    useOthers,
    useOthersMapped,
    useOthersConnectionIds,
    useOther,
    useBroadcastEvent,
    useEventListener,
    useErrorListener,
    useStorage,
    useBatch,
    useHistory,
    useUndo,
    useRedo,
    useCanUndo,
    useCanRedo,
    useMutation,
    useStatus,
    useLostConnectionListener,
  },
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent, ThreadMetadata>(client);

// Create the global Liveblocks context for user-level features
export const {
  suspense: {
    LiveblocksProvider,
    useInboxNotifications,
    useMarkInboxNotificationAsRead,
    useUser,
  },
} = createLiveblocksContext(client);

// Default presence values
export const defaultPresence: Presence = {
  cursor: null,
  selectedShapes: [],
  pencilDraft: null,
  penColor: "#000000",
  currentPage: "page:page",
};
