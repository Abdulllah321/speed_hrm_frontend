import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiBaseUrl(): string {
  // If explicitly configured in env, use that
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  // Check if running in browser
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    // If accessing via localtest.me (including subdomains), use api.localtest.me
    if (hostname.includes("localtest.me")) {
      return "http://api.localtest.me:5000";
    }
  }

  // Fallback to localhost
  return "http://localhost:5000";
}
// Helper to get cookie domain
export const getCookieDomain = (host: string) => {
  // 1. Check if domain is explicitly configured
  if (process.env.NEXT_PUBLIC_COOKIE_DOMAIN) {
    return process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  }

  if (!host) return undefined;

  // Remove port if present
  const hostname = host.split(":")[0];

  // For localtest.me subdomains (e.g. hr.localtest.me -> .localtest.me)
  if (hostname.includes("localtest.me")) {
    return ".localtest.me";
  }

  // For localhost / 127.0.0.1 - do not set domain (host-only)
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return undefined;
  }

  // For production domains (e.g., app.example.com -> .example.com)
  const parts = hostname.split(".");
  if (parts.length >= 2) {
    // If it's a simple host like 'mysite.com', we want '.mysite.com'
    // If it's 'app.mysite.com', we also want '.mysite.com'
    return "." + parts.slice(-2).join(".");
  }

  return undefined;
};
