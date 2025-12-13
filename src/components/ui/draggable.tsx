"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

interface DraggableProps {
  children: ReactNode;
  initialPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  handle?: string; // CSS selector for drag handle
  bounds?: "parent" | "window";
  className?: string;
}

export function Draggable({
  children,
  initialPosition = { x: 20, y: 80 },
  onPositionChange,
  handle,
  bounds = "window",
  className = "",
}: DraggableProps) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    // Check if we should only drag from handle
    if (handle && dragRef.current) {
      const handleEl = dragRef.current.querySelector(handle);
      if (handleEl && !handleEl.contains(e.target as Node)) {
        return;
      }
    }

    e.preventDefault();
    setIsDragging(true);
    
    const rect = dragRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      let newX = e.clientX - dragOffset.current.x;
      let newY = e.clientY - dragOffset.current.y;

      // Apply bounds
      if (bounds === "window" && dragRef.current) {
        const rect = dragRef.current.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
      }

      setPosition({ x: newX, y: newY });
      onPositionChange?.({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, bounds, onPositionChange]);

  return (
    <div
      ref={dragRef}
      className={`fixed z-[200] ${isDragging ? "cursor-grabbing" : ""} ${className}`}
      style={{
        left: position.x,
        top: position.y,
        touchAction: "none",
      }}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
}
