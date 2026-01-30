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
