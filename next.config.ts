import type { NextConfig } from "next";

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

  // Experimental features
  experimental: {
    // Enable if needed
  },
};

export default nextConfig;
