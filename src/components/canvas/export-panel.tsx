"use client";

import { useState } from "react";
import { Editor } from "tldraw";
import { 
  Download, 
  Image, 
  FileText, 
  FileJson, 
  FileCode,
  X,
  Loader2 
} from "lucide-react";
import {
  exportToPNG,
  exportToSVG,
  exportToMarkdown,
  exportToJSON,
  downloadBlob,
  downloadText,
} from "@/lib/export";

interface ExportPanelProps {
  editor: Editor | null;
  canvasId: string;
  canvasName?: string;
  onClose: () => void;
}

export function ExportPanel({ editor, canvasId, canvasName = "canvas", onClose }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExportPNG = async () => {
    if (!editor) return;
    setIsExporting("png");
    try {
      const blob = await exportToPNG(editor);
      if (blob) downloadBlob(blob, `${canvasName}-${canvasId}.png`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportSVG = async () => {
    if (!editor) return;
    setIsExporting("svg");
    try {
      const svg = await exportToSVG(editor);
      if (svg) downloadText(svg, `${canvasName}-${canvasId}.svg`, "image/svg+xml");
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportMarkdown = () => {
    if (!editor) return;
    setIsExporting("md");
    try {
      const md = exportToMarkdown(editor);
      downloadText(md, `${canvasName}-${canvasId}.md`, "text/markdown");
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportJSON = () => {
    if (!editor) return;
    setIsExporting("json");
    try {
      const json = exportToJSON(editor);
      downloadText(json, `${canvasName}-${canvasId}.json`, "application/json");
    } finally {
      setIsExporting(null);
    }
  };

  const exportOptions = [
    { id: "png", label: "PNG", desc: "Image", icon: Image, onClick: handleExportPNG },
    { id: "svg", label: "SVG", desc: "Vector", icon: FileCode, onClick: handleExportSVG },
    { id: "md", label: "Markdown", desc: "Text", icon: FileText, onClick: handleExportMarkdown },
    { id: "json", label: "JSON", desc: "Backup", icon: FileJson, onClick: handleExportJSON },
  ];

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-xl bg-card border border-border p-4 shadow-xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Export</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-2">
          {exportOptions.map((option) => (
            <button
              key={option.id}
              onClick={option.onClick}
              disabled={!editor || isExporting !== null}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 text-center transition-all hover:border-primary/50 hover:bg-accent disabled:opacity-40"
            >
              {isExporting === option.id ? (
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              ) : (
                <option.icon className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-xs font-medium text-foreground">{option.label}</p>
                <p className="text-[9px] text-muted-foreground">{option.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
