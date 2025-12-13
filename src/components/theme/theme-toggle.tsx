"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider";
import { useState, useRef, useEffect } from "react";

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ showLabel = false, className = "" }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  // Show placeholder during SSR
  if (!mounted) {
    return (
      <div className={`relative ${className}`}>
        <button
          className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-accent dark:hover:bg-gray-700"
          title="Toggle theme"
        >
          <Sun className="h-5 w-5 text-foreground" />
        </button>
      </div>
    );
  }

  const CurrentIcon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-accent dark:hover:bg-gray-700"
        title="Toggle theme"
      >
        <CurrentIcon className="h-5 w-5 text-foreground" />
        {showLabel && (
          <span className="text-sm text-foreground">
            {theme === "system" ? "System" : resolvedTheme === "dark" ? "Dark" : "Light"}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-36 rounded-lg border border-border bg-card p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => {
                setTheme(value);
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                theme === value
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent dark:hover:bg-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple toggle button (no dropdown)
export function ThemeToggleSimple({ className = "" }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show placeholder during SSR
  if (!mounted) {
    return (
      <button
        className={`rounded-lg p-2 transition-colors hover:bg-accent dark:hover:bg-gray-700 ${className}`}
        title="Toggle theme"
      >
        <Sun className="h-5 w-5 text-foreground" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`rounded-lg p-2 transition-colors hover:bg-accent dark:hover:bg-gray-700 ${className}`}
      title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-5 w-5 text-foreground" />
      ) : (
        <Moon className="h-5 w-5 text-foreground" />
      )}
    </button>
  );
}
