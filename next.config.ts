import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  // Configure allowed development origins for cross-origin requests
  allowedDevOrigins: [
    "hr.localtest.me",
    "admin.localtest.me",
    "master.localtest.me",
    "auth.localtest.me",
    "erp.localtest.me",
    "pos.localtest.me",
    "localhost",
    "127.0.0.1",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    staleTimes: {
      dynamic: 0,  // ✅ dynamic pages cache nahi
      static: 0,
    },
  },
  env: {
    API_URL: process.env.API_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY,
  },

};

export default nextConfig;
