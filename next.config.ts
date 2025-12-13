import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Image optimization settings
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.clerk.com",
      },
      {
        protocol: "https",
        hostname: "**.vercel-blob.com",
      },
    ],
  },

  // Turbopack configuration (since we use --turbo)
  turbopack: {
    resolveAlias: {
      // Add any aliases if needed
    },
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Organization and project from Sentry dashboard
  org: process.env.SENTRY_ORG || "your-org",
  project: process.env.SENTRY_PROJECT || "ai-canvas",

  // Only upload source maps in production
  silent: process.env.NODE_ENV !== "production",

  // Upload source maps for better error tracking
  widenClientFileUpload: true,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,

  // Hide source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically instrument API routes
  automaticVercelMonitors: true,
};

// Wrap the config with Sentry
export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
