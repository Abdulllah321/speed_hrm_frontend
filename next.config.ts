import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    API_URL: process.env.API_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  async rewrites() {
    // Development rewrites (localhost)
    const localhostRewrites = [
      { subdomain: "hr", path: "/hr" },
      { subdomain: "admin", path: "/admin" },
      { subdomain: "master", path: "/master" },
      { subdomain: "auth", path: "/auth" },
    ];
    
    const rewrites = localhostRewrites.map(({ subdomain, path }) => ({
      source: "/:path*",
      destination: `${path}/:path*`,
      has: [
        {
          type: "host" as const,
          value: `${subdomain}.localhost`,
        },
      ],
    }));
    
    // Production rewrites - these will need to be configured per domain
    // For now, we'll handle this in middleware for dynamic domain support
    // You can add specific domain rewrites here if needed
    
    return rewrites;
  },
};

export default nextConfig;
