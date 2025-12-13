"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  // Get system preference
  const getSystemTheme = (): "light" | "dark" => {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  // Resolve the actual theme
  const resolveTheme = (t: Theme): "light" | "dark" => {
    if (t === "system") return getSystemTheme();
    return t;
  };

  // Initialize theme from localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("ai-canvas-theme") as Theme | null;
    if (stored) {
      setThemeState(stored);
      setResolvedTheme(resolveTheme(stored));
    } else {
      // Default to dark theme
      setThemeState("dark");
      setResolvedTheme("dark");
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;
    
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);

    // Update document class
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolved);

    // Save to localStorage
    localStorage.setItem("ai-canvas-theme", theme);
  }, [theme, mounted]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted || theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      setResolvedTheme(getSystemTheme());
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(getSystemTheme());
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return default values if context is not available yet
    return {
      theme: "dark" as Theme,
      resolvedTheme: "dark" as "light" | "dark",
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}
