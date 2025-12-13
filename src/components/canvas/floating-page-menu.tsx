"use client";

import { useState, useEffect } from "react";
import { useEditor, TLPageId } from "tldraw";
import { Draggable } from "@/components/ui/draggable";
import {
  ChevronDown,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  Plus,
  GripVertical,
  MoreHorizontal,
  Layers,
} from "lucide-react";

export function FloatingPageMenu() {
  const editor = useEditor();
  const [pages, setPages] = useState<{ id: TLPageId; name: string }[]>([]);
  const [currentPage, setCurrentPage] = useState<string>("Page 1");
  const [showPageList, setShowPageList] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Sync pages with editor
  useEffect(() => {
    if (!editor) return;

    const updatePages = () => {
      const allPages = editor.getPages();
      setPages(allPages.map((p) => ({ id: p.id, name: p.name })));
      const current = editor.getCurrentPage();
      setCurrentPage(current.name);
    };

    updatePages();
    
    const unsubscribe = editor.store.listen(updatePages, {
      source: "all",
      scope: "document",
    });

    return () => unsubscribe();
  }, [editor]);

  const handleUndo = () => editor?.undo();
  const handleRedo = () => editor?.redo();
  
  const handleDelete = () => {
    if (!editor) return;
    const selectedIds = editor.getSelectedShapeIds();
    if (selectedIds.length > 0) {
      editor.deleteShapes(selectedIds);
    }
  };

  const handleDuplicate = () => {
    if (!editor) return;
    const selectedIds = editor.getSelectedShapeIds();
    if (selectedIds.length > 0) {
      editor.duplicateShapes(selectedIds);
    }
  };

  const handlePageChange = (pageId: TLPageId) => {
    editor?.setCurrentPage(pageId);
    setShowPageList(false);
  };

  const handleAddPage = () => {
    if (!editor) return;
    const newPageId = `page:${Date.now()}` as TLPageId;
    editor.createPage({ id: newPageId, name: `Page ${pages.length + 1}` });
    editor.setCurrentPage(newPageId);
    setShowPageList(false);
  };

  const canUndo = editor?.getCanUndo() ?? false;
  const canRedo = editor?.getCanRedo() ?? false;
  const hasSelection = (editor?.getSelectedShapeIds().length ?? 0) > 0;

  return (
    <Draggable
      initialPosition={{ x: 16, y: 70 }}
      handle=".drag-handle"
    >
      <div className="flex items-center gap-1 rounded-lg bg-card/95 backdrop-blur-md border border-border shadow-lg p-1">
        {/* Drag Handle */}
        <div className="drag-handle cursor-grab active:cursor-grabbing p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors">
          <GripVertical className="h-3.5 w-3.5" />
        </div>

        {/* Page Selector */}
        <div className="relative">
          <button
            onClick={() => setShowPageList(!showPageList)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-foreground hover:bg-accent rounded transition-colors"
          >
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="max-w-[80px] truncate">{currentPage}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>

          {/* Page List Dropdown */}
          {showPageList && (
            <div className="absolute top-full left-0 mt-1 w-40 rounded-lg bg-card border border-border shadow-xl py-1 z-50">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => handlePageChange(page.id)}
                  className={`w-full px-3 py-1.5 text-xs text-left hover:bg-accent transition-colors ${
                    page.name === currentPage ? "bg-accent text-primary" : "text-foreground"
                  }`}
                >
                  {page.name}
                </button>
              ))}
              <div className="border-t border-border my-1" />
              <button
                onClick={handleAddPage}
                className="w-full px-3 py-1.5 text-xs text-left text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center gap-2"
              >
                <Plus className="h-3 w-3" />
                Add page
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-border mx-0.5" />

        {/* Undo/Redo */}
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>

        <div className="w-px h-4 bg-border mx-0.5" />

        {/* Delete/Duplicate */}
        <button
          onClick={handleDelete}
          disabled={!hasSelection}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleDuplicate}
          disabled={!hasSelection}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Duplicate"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>

        {/* More Options */}
        <div className="relative">
          <button
            onClick={() => setShowMore(!showMore)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
            title="More options"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>

          {showMore && (
            <div className="absolute top-full right-0 mt-1 w-36 rounded-lg bg-card border border-border shadow-xl py-1 z-50">
              <button
                onClick={() => {
                  editor?.selectAll();
                  setShowMore(false);
                }}
                className="w-full px-3 py-1.5 text-xs text-left text-foreground hover:bg-accent transition-colors"
              >
                Select all
              </button>
              <button
                onClick={() => {
                  editor?.selectNone();
                  setShowMore(false);
                }}
                className="w-full px-3 py-1.5 text-xs text-left text-foreground hover:bg-accent transition-colors"
              >
                Deselect all
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => {
                  editor?.zoomToFit();
                  setShowMore(false);
                }}
                className="w-full px-3 py-1.5 text-xs text-left text-foreground hover:bg-accent transition-colors"
              >
                Zoom to fit
              </button>
              <button
                onClick={() => {
                  editor?.resetZoom();
                  setShowMore(false);
                }}
                className="w-full px-3 py-1.5 text-xs text-left text-foreground hover:bg-accent transition-colors"
              >
                Reset zoom
              </button>
            </div>
          )}
        </div>
      </div>
    </Draggable>
  );
}
