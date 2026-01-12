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
    "localhost",
    "127.0.0.1",
  ],
  env: {
    API_URL: process.env.API_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  async rewrites() {
    // Development rewrites (localhost and localtest.me)
    const localhostRewrites = [
      { subdomain: "hr", path: "/hr" },
      { subdomain: "admin", path: "/admin" },
      { subdomain: "master", path: "/master" },
      { subdomain: "auth", path: "/auth" },
    ];
    
    const rewrites = [
      // Handle localhost subdomains
      ...localhostRewrites.map(({ subdomain, path }) => ({
        source: "/:path*",
        destination: `${path}/:path*`,
        has: [
          {
            type: "host" as const,
            value: `${subdomain}.localhost`,
          },
        ],
      })),
      // Handle localtest.me subdomains
      ...localhostRewrites.map(({ subdomain, path }) => ({
        source: "/:path*",
        destination: `${path}/:path*`,
        has: [
          {
            type: "host" as const,
            value: `${subdomain}.localtest.me`,
          },
        ],
      })),
    ];
    
    return rewrites;
  },
};

export default nextConfig;
