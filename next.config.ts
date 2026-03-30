import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";
const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  compiler: {
    removeConsole: isDevelopment ? false : { exclude: ["error"] },
  },
  // Configure allowed development origins for cross-origin requests
  allowedDevOrigins: [
    ...(isDevelopment ? ["hr.localtest.me",
      "admin.localtest.me",
      "master.localtest.me",
      "auth.localtest.me",
      "erp.localtest.me",
      "pos.localtest.me",
      "localhost",
      "127.0.0.1"] : [
      "hr.spl.inplsoftwares.com",
      "admin.spl.inplsoftwares.com",
      "master.spl.inplsoftwares.com",
      "auth.spl.inplsoftwares.com",
      "erp.spl.inplsoftwares.com",
      "pos.spl.inplsoftwares.com",
    ]),
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
