import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configure allowed development origins for cross-origin requests
  allowedDevOrigins: [
    "hr.localtest.me",
    "admin.localtest.me", 
    "master.localtest.me",
    "auth.localtest.me",
    "erp.localtest.me",
    "localhost",
    "127.0.0.1",
  ],
  env: {
    API_URL: process.env.API_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },

};

export default nextConfig;
