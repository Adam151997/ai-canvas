import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme";
import { SessionProvider } from "@/components/session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Canvas - Collaborative Spatial Intelligence",
  description: "A living archive where work, discussion, and history coexist on an infinite plane.",
  keywords: ["collaboration", "canvas", "AI", "whiteboard", "team", "knowledge"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#3b82f6",
};

// Script to prevent theme flash on load
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('ai-canvas-theme') || 'dark';
      var resolved = theme === 'system' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
      document.documentElement.classList.add(resolved);
    } catch (e) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <SessionProvider>
          <ThemeProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
