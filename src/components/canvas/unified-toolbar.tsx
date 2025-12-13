"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  useEditor, 
  DefaultColorStyle,
  DefaultSizeStyle,
  DefaultFillStyle,
  DefaultDashStyle,
  GeoShapeGeoStyle,
} from "tldraw";
import {
  MousePointer2,
  Hand,
  Pencil,
  Eraser,
  Type,
  Square,
  Circle,
  Triangle,
  Diamond,
  ArrowUpRight,
  Minus,
  Image,
  StickyNote,
  Hexagon,
  Star,
  Frame,
  Highlighter,
  Palette,
  ChevronUp,
} from "lucide-react";

// Color type
type TLColor = "black" | "grey" | "white" | "red" | "orange" | "yellow" | "green" | "light-green" | "blue" | "light-blue" | "violet" | "light-violet";
type TLSize = "s" | "m" | "l" | "xl";
type TLFill = "none" | "semi" | "solid" | "pattern";
type TLDash = "solid" | "dashed" | "dotted" | "draw";
type TLGeo = "rectangle" | "ellipse" | "triangle" | "diamond" | "hexagon" | "star" | "rhombus" | "trapezoid" | "arrow-right" | "arrow-left" | "arrow-up" | "arrow-down" | "x-box" | "check-box" | "cloud" | "pentagon" | "octagon" | "oval" | "heart";

// Tldraw colors
const COLORS: { id: TLColor; hex: string; name: string }[] = [
  { id: "black", hex: "#1d1d1d", name: "Black" },
  { id: "grey", hex: "#9ea5b0", name: "Grey" },
  { id: "white", hex: "#ffffff", name: "White" },
  { id: "red", hex: "#e03131", name: "Red" },
  { id: "orange", hex: "#ff922b", name: "Orange" },
  { id: "yellow", hex: "#ffc034", name: "Yellow" },
  { id: "green", hex: "#099268", name: "Green" },
  { id: "light-green", hex: "#40c057", name: "Light Green" },
  { id: "blue", hex: "#1971c2", name: "Blue" },
  { id: "light-blue", hex: "#4dabf7", name: "Light Blue" },
  { id: "violet", hex: "#ae3ec9", name: "Violet" },
  { id: "light-violet", hex: "#da77f2", name: "Light Violet" },
];

// Sizes
const SIZES: { id: TLSize; label: string }[] = [
  { id: "s", label: "S" },
  { id: "m", label: "M" },
  { id: "l", label: "L" },
  { id: "xl", label: "XL" },
];

// Fill styles
const FILLS: { id: TLFill; label: string }[] = [
  { id: "none", label: "None" },
  { id: "semi", label: "Semi" },
  { id: "solid", label: "Solid" },
  { id: "pattern", label: "Pattern" },
];

// Dash styles
const DASHES: { id: TLDash; label: string; icon: string }[] = [
  { id: "solid", label: "Solid", icon: "─────" },
  { id: "dashed", label: "Dashed", icon: "── ── ──" },
  { id: "dotted", label: "Dotted", icon: "· · · · ·" },
  { id: "draw", label: "Draw", icon: "～～～" },
];

// Tool definitions
const TOOLS = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "hand", icon: Hand, label: "Hand" },
  { id: "draw", icon: Pencil, label: "Draw" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
  { id: "arrow", icon: ArrowUpRight, label: "Arrow" },
  { id: "line", icon: Minus, label: "Line" },
  { id: "text", icon: Type, label: "Text" },
  { id: "note", icon: StickyNote, label: "Note" },
  { id: "frame", icon: Frame, label: "Frame" },
  { id: "highlight", icon: Highlighter, label: "Highlight" },
];

// Geo shapes
const GEO_SHAPES: { id: TLGeo; icon: typeof Square; label: string }[] = [
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "ellipse", icon: Circle, label: "Ellipse" },
  { id: "triangle", icon: Triangle, label: "Triangle" },
  { id: "diamond", icon: Diamond, label: "Diamond" },
  { id: "hexagon", icon: Hexagon, label: "Hexagon" },
  { id: "star", icon: Star, label: "Star" },
];

export function UnifiedToolbar() {
  const editor = useEditor();
  const [currentTool, setCurrentTool] = useState("select");
  const [showShapes, setShowShapes] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showStyles, setShowStyles] = useState(false);
  const [currentColor, setCurrentColor] = useState<TLColor>("black");
  const [currentSize, setCurrentSize] = useState<TLSize>("m");
  const [currentFill, setCurrentFill] = useState<TLFill>("none");
  const [currentDash, setCurrentDash] = useState<TLDash>("draw");
  const [currentGeo, setCurrentGeo] = useState<TLGeo>("rectangle");

  // Sync with editor
  useEffect(() => {
    if (!editor) return;

    const updateFromEditor = () => {
      const tool = editor.getCurrentToolId();
      setCurrentTool(tool);
    };

    updateFromEditor();
    
    const unsubscribe = editor.store.listen(updateFromEditor, {
      source: "user",
      scope: "session",
    });

    return () => unsubscribe();
  }, [editor]);

  const selectTool = useCallback((toolId: string) => {
    if (!editor) return;
    editor.setCurrentTool(toolId);
    setCurrentTool(toolId);
    setShowShapes(false);
  }, [editor]);

  const selectGeoShape = useCallback((geoId: TLGeo) => {
    if (!editor) return;
    editor.setCurrentTool("geo");
    // Use the proper style API
    editor.setStyleForNextShapes(GeoShapeGeoStyle, geoId);
    setCurrentGeo(geoId);
    setCurrentTool("geo");
    setShowShapes(false);
  }, [editor]);

  const selectColor = useCallback((colorId: TLColor) => {
    if (!editor) return;
    // Use the proper style API with DefaultColorStyle
    editor.setStyleForNextShapes(DefaultColorStyle, colorId);
    editor.setStyleForSelectedShapes(DefaultColorStyle, colorId);
    setCurrentColor(colorId);
  }, [editor]);

  const selectSize = useCallback((sizeId: TLSize) => {
    if (!editor) return;
    editor.setStyleForNextShapes(DefaultSizeStyle, sizeId);
    editor.setStyleForSelectedShapes(DefaultSizeStyle, sizeId);
    setCurrentSize(sizeId);
  }, [editor]);

  const selectFill = useCallback((fillId: TLFill) => {
    if (!editor) return;
    editor.setStyleForNextShapes(DefaultFillStyle, fillId);
    editor.setStyleForSelectedShapes(DefaultFillStyle, fillId);
    setCurrentFill(fillId);
  }, [editor]);

  const selectDash = useCallback((dashId: TLDash) => {
    if (!editor) return;
    editor.setStyleForNextShapes(DefaultDashStyle, dashId);
    editor.setStyleForSelectedShapes(DefaultDashStyle, dashId);
    setCurrentDash(dashId);
  }, [editor]);

  const currentColorHex = COLORS.find((c) => c.id === currentColor)?.hex || "#1d1d1d";
  const CurrentGeoIcon = GEO_SHAPES.find((s) => s.id === currentGeo)?.icon || Square;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[150] flex flex-col items-center gap-2">
      {/* Style Panel (expandable) */}
      {showStyles && (
        <div className="flex items-center gap-3 rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-xl px-3 py-2 animate-slide-up">
          {/* Colors */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground mr-1">Color</span>
            <div className="flex gap-0.5">
              {COLORS.slice(0, 8).map((color) => (
                <button
                  key={color.id}
                  onClick={() => selectColor(color.id)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                    currentColor === color.id ? "border-primary scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
              <div className="relative">
                <button
                  onClick={() => setShowColors(!showColors)}
                  className="w-5 h-5 rounded-full border border-border bg-gradient-to-br from-red-500 via-green-500 to-blue-500 hover:scale-110 transition-transform"
                  title="More colors"
                />
                {showColors && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg p-2 shadow-xl grid grid-cols-4 gap-1">
                    {COLORS.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => {
                          selectColor(color.id);
                          setShowColors(false);
                        }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                          currentColor === color.id ? "border-primary" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="w-px h-6 bg-border" />

          {/* Size */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground mr-1">Size</span>
            {SIZES.map((size) => (
              <button
                key={size.id}
                onClick={() => selectSize(size.id)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                  currentSize === size.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-border" />

          {/* Fill */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground mr-1">Fill</span>
            {FILLS.map((fill) => (
              <button
                key={fill.id}
                onClick={() => selectFill(fill.id)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                  currentFill === fill.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {fill.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-border" />

          {/* Dash */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground mr-1">Line</span>
            {DASHES.map((dash) => (
              <button
                key={dash.id}
                onClick={() => selectDash(dash.id)}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  currentDash === dash.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
                title={dash.label}
              >
                {dash.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Toolbar */}
      <div className="flex items-center gap-1 rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-xl px-2 py-1.5">
        {/* Primary Tools */}
        {TOOLS.slice(0, 4).map((tool) => {
          const Icon = tool.icon;
          const isActive = currentTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => selectTool(tool.id)}
              className={`p-2 rounded-lg transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
              title={tool.label}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}

        <div className="w-px h-6 bg-border mx-1" />

        {/* Shape Selector */}
        <div className="relative">
          <button
            onClick={() => setShowShapes(!showShapes)}
            className={`p-2 rounded-lg transition-all flex items-center gap-1 ${
              currentTool === "geo"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
            title="Shapes"
          >
            <CurrentGeoIcon className="h-4 w-4" />
            <ChevronUp className={`h-3 w-3 transition-transform ${showShapes ? "" : "rotate-180"}`} />
          </button>

          {showShapes && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg p-2 shadow-xl flex gap-1">
              {GEO_SHAPES.map((shape) => {
                const Icon = shape.icon;
                return (
                  <button
                    key={shape.id}
                    onClick={() => selectGeoShape(shape.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      currentGeo === shape.id && currentTool === "geo"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                    title={shape.label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* More Tools */}
        {TOOLS.slice(4).map((tool) => {
          const Icon = tool.icon;
          const isActive = currentTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => selectTool(tool.id)}
              className={`p-2 rounded-lg transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
              title={tool.label}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}

        <div className="w-px h-6 bg-border mx-1" />

        {/* Current Color Indicator + Style Toggle */}
        <button
          onClick={() => setShowStyles(!showStyles)}
          className={`p-2 rounded-lg transition-all flex items-center gap-1.5 ${
            showStyles
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
          title="Style options"
        >
          <div
            className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: currentColorHex }}
          />
          <Palette className="h-3.5 w-3.5" />
        </button>

        {/* Image */}
        <button
          onClick={() => selectTool("asset")}
          className={`p-2 rounded-lg transition-all ${
            currentTool === "asset"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
          title="Insert image"
        >
          <Image className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
