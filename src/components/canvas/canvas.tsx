"use client";

import { useCallback, useState, useEffect } from "react";
import { 
  Tldraw, 
  Editor, 
  TLShapeId,
  TLUiComponents,
  useEditor,
} from "tldraw";
import { useRoom, useSelf, useOthers, useUpdateMyPresence } from "@/components/liveblocks/liveblocks.config";
import "tldraw/tldraw.css";
import { JanitorPanel } from "./janitor-panel";
import { GhostPanel, ShapeHistory } from "./ghost";
import { ExportPanel } from "./export-panel";
import { AssetLibrary } from "./asset-library";
import { FloatingPageMenu } from "./floating-page-menu";
import { UnifiedToolbar } from "./unified-toolbar";
import { CanvasMinimap } from "./canvas-minimap";
import { ConnectionStatus } from "@/components/ui/connection-status";
import { SyncStatusBadge } from "@/components/ui/sync-status";
import { useTheme } from "@/components/theme";
import { Download, FolderOpen } from "lucide-react";

interface CanvasProps {
  canvasId: string;
  canvasName?: string;
}

// Collaboration cursors component
function Cursors() {
  const others = useOthers();

  return (
    <>
      {others.map(({ connectionId, presence, info }) => {
        if (!presence?.cursor) return null;

        return (
          <div
            key={connectionId}
            className="pointer-events-none absolute z-[9999]"
            style={{
              left: presence.cursor.x,
              top: presence.cursor.y,
            }}
          >
            <svg
              width="20"
              height="30"
              viewBox="0 0 24 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.65376 12.4563L0.161499 0.577881L11.6985 7.65367L5.65376 12.4563Z"
                fill={info?.color || "#000"}
              />
            </svg>
            <div
              className="absolute left-3 top-3 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] text-white"
              style={{ backgroundColor: info?.color || "#000" }}
            >
              {info?.name || "Anonymous"}
            </div>
          </div>
        );
      })}
    </>
  );
}

// Compact user presence avatars
function Avatars() {
  const users = useOthers();
  const self = useSelf();

  return (
    <div className="absolute right-3 top-3 z-[100] flex -space-x-1.5">
      {self && (
        <div
          className="relative h-6 w-6 rounded-full border-2 border-card shadow-sm"
          style={{ backgroundColor: self.info?.color }}
          title={`${self.info?.name} (you)`}
        >
          {self.info?.avatar ? (
            <img
              src={self.info.avatar}
              alt={self.info.name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[10px] font-medium text-white">
              {self.info?.name?.charAt(0) || "?"}
            </span>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-card bg-green-500" />
        </div>
      )}

      {users.slice(0, 4).map(({ connectionId, info }) => (
        <div
          key={connectionId}
          className="relative h-6 w-6 rounded-full border-2 border-card shadow-sm"
          style={{ backgroundColor: info?.color }}
          title={info?.name}
        >
          {info?.avatar ? (
            <img
              src={info.avatar}
              alt={info.name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[10px] font-medium text-white">
              {info?.name?.charAt(0) || "?"}
            </span>
          )}
        </div>
      ))}

      {users.length > 4 && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground shadow-sm">
          +{users.length - 4}
        </div>
      )}
    </div>
  );
}

// Extract text content from selected shapes
function extractTextFromShapes(editor: Editor, shapeIds: TLShapeId[]): string[] {
  const texts: string[] = [];
  
  for (const id of shapeIds) {
    const shape = editor.getShape(id);
    if (!shape) continue;
    
    if (shape.type === "text" && "text" in shape.props) {
      texts.push(shape.props.text as string);
    } else if (shape.type === "note" && "text" in shape.props) {
      texts.push(shape.props.text as string);
    } else if (shape.type === "geo" && "text" in shape.props) {
      const text = shape.props.text as string;
      if (text) texts.push(text);
    } else if (shape.type === "arrow" && "text" in shape.props) {
      const text = shape.props.text as string;
      if (text) texts.push(text);
    }
  }
  
  return texts.filter((t) => t && t.trim().length > 0);
}

// Hide ALL default Tldraw UI components
const customComponents: TLUiComponents = {
  StylePanel: null,
  Toolbar: null,
  PageMenu: null,
  NavigationPanel: null,
  MainMenu: null,
  ActionsMenu: null,
  QuickActions: null,
  ContextMenu: null,
  HelpMenu: null,
  ZoomMenu: null,
  DebugPanel: null,
  DebugMenu: null,
  MenuPanel: null,
  TopPanel: null,
  SharePanel: null,
  Minimap: null,
};

// Component to sync theme with Tldraw using CSS class
function ThemeSync() {
  const editor = useEditor();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (editor && mounted) {
      try {
        const container = editor.getContainer();
        if (container) {
          if (resolvedTheme === "dark") {
            container.classList.add("tl-theme__dark");
            container.classList.remove("tl-theme__light");
          } else {
            container.classList.add("tl-theme__light");
            container.classList.remove("tl-theme__dark");
          }
        }
      } catch (err) {
        console.warn("Could not sync theme with Tldraw:", err);
      }
    }
  }, [editor, resolvedTheme, mounted]);

  return null;
}

// Custom UI wrapper inside Tldraw context
function CanvasUI() {
  return (
    <>
      <ThemeSync />
      <FloatingPageMenu />
      <UnifiedToolbar />
      {/* Minimap positioned at bottom left, above Ghost panel */}
      <div className="fixed bottom-[180px] left-4 z-[140]">
        <CanvasMinimap />
      </div>
    </>
  );
}

export function Canvas({ canvasId, canvasName }: CanvasProps) {
  const room = useRoom();
  const updateMyPresence = useUpdateMyPresence();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [selectedContent, setSelectedContent] = useState<string[]>([]);
  const [shapeHistory, setShapeHistory] = useState<{
    shapeId: string;
    position: { x: number; y: number };
  } | null>(null);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);

  // Handle editor mount
  const handleMount = useCallback(
    (editorInstance: Editor) => {
      setEditor(editorInstance);

      // Track cursor position for presence
      const handlePointerMove = (e: PointerEvent) => {
        try {
          const point = editorInstance.screenToPage({ x: e.clientX, y: e.clientY });
          updateMyPresence({
            cursor: { x: point.x, y: point.y },
          });
        } catch (err) {
          // Ignore errors during initialization
        }
      };

      const handlePointerLeave = () => {
        updateMyPresence({ cursor: null });
      };

      const handleSelectionChange = () => {
        try {
          const selectedIds = editorInstance.getSelectedShapeIds();
          updateMyPresence({
            selectedShapes: [...selectedIds],
          });
          
          const texts = extractTextFromShapes(editorInstance, selectedIds);
          setSelectedContent(texts);
        } catch (err) {
          // Ignore errors
        }
      };

      const container = editorInstance.getContainer();
      container.addEventListener("pointermove", handlePointerMove);
      container.addEventListener("pointerleave", handlePointerLeave);
      editorInstance.on("change", handleSelectionChange);

      return () => {
        container.removeEventListener("pointermove", handlePointerMove);
        container.removeEventListener("pointerleave", handlePointerLeave);
        editorInstance.off("change", handleSelectionChange);
      };
    },
    [updateMyPresence]
  );

  // Handle right-click on shape to show history
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!editor) return;

      const point = editor.screenToPage({ x: e.clientX, y: e.clientY });
      const shape = editor.getShapeAtPoint(point);

      if (shape) {
        e.preventDefault();
        setShapeHistory({
          shapeId: shape.id,
          position: { x: e.clientX, y: e.clientY },
        });
      }
    },
    [editor]
  );

  // Handle inserting asset from library
  const handleInsertAsset = useCallback(
    async (asset: { url: string; filename: string; mimeType: string }) => {
      if (!editor) return;

      const isImage = asset.mimeType.startsWith("image/");
      
      if (isImage) {
        const center = editor.getViewportScreenCenter();
        await editor.putExternalContent({
          type: "url",
          url: asset.url,
          point: editor.screenToPage(center),
        });
      }

      setShowAssetLibrary(false);
    },
    [editor]
  );

  const handleSynthesisComplete = useCallback(
    (result: { summary: string; keyPoints: string[]; themes: string[] }) => {
      if (!editor) return;
      console.log("Synthesis complete:", result);
    },
    [editor]
  );

  const handleClusterComplete = useCallback(
    (result: { clusters: any[]; connections: any[] }) => {
      if (!editor) return;
      console.log("Clustering complete:", result);
    },
    [editor]
  );

  const handleTimeTravel = useCallback(
    (timestamp: number) => {
      console.log("Time traveling to:", new Date(timestamp).toISOString());
    },
    []
  );

  return (
    <div 
      className="relative w-full h-full"
      onContextMenu={handleContextMenu}
    >
      {/* Connection Status */}
      <ConnectionStatus />

      {/* User avatars */}
      <Avatars />

      {/* Collaboration cursors */}
      <Cursors />

      {/* Compact Canvas header */}
      <div className="absolute left-3 top-3 z-[100] flex items-center gap-1.5">
        <div className="rounded-md bg-card/90 px-2 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm border border-border">
          {canvasName || `Canvas: ${canvasId}`}
        </div>
        
        <SyncStatusBadge />
        
        <button
          onClick={() => setShowAssetLibrary(true)}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-card/90 text-muted-foreground shadow-sm backdrop-blur-sm border border-border hover:bg-card hover:text-foreground transition-colors"
          title="Asset Library"
        >
          <FolderOpen className="h-3 w-3" />
        </button>
        
        <button
          onClick={() => setShowExportPanel(true)}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-card/90 text-muted-foreground shadow-sm backdrop-blur-sm border border-border hover:bg-card hover:text-foreground transition-colors"
          title="Export Canvas"
        >
          <Download className="h-3 w-3" />
        </button>
      </div>

      {/* Tldraw canvas with custom UI */}
      <div className="absolute inset-0">
        <Tldraw 
          onMount={handleMount}
          components={customComponents}
          inferDarkMode={false}
        >
          <CanvasUI />
        </Tldraw>
      </div>

      {/* AI Janitor Panel (bottom right) */}
      <JanitorPanel
        canvasId={canvasId}
        selectedContent={selectedContent}
        onSynthesisComplete={handleSynthesisComplete}
        onClusterComplete={handleClusterComplete}
      />

      {/* Ghost Timeline Panel (bottom left) */}
      <GhostPanel
        canvasId={canvasId}
        onTimeTravel={handleTimeTravel}
      />

      {/* Shape History Popup */}
      {shapeHistory && (
        <ShapeHistory
          shapeId={shapeHistory.shapeId}
          canvasId={canvasId}
          position={shapeHistory.position}
          onClose={() => setShapeHistory(null)}
        />
      )}

      {/* Export Panel */}
      {showExportPanel && (
        <ExportPanel
          editor={editor}
          canvasId={canvasId}
          canvasName={canvasName}
          onClose={() => setShowExportPanel(false)}
        />
      )}

      {/* Asset Library */}
      {showAssetLibrary && (
        <AssetLibrary
          canvasId={canvasId}
          onClose={() => setShowAssetLibrary(false)}
          onInsertAsset={handleInsertAsset}
        />
      )}
    </div>
  );
}
