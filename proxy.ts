import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require authentication
const publicRoutes = ["/auth/login"];

// Routes that require authentication
const protectedRoutes = ["/hr", "/admin", "/master"];

// Admin-only routes
const adminRoutes = ["/admin"];

// Subdomain routing configuration
const SUBDOMAIN_ROUTES = {
  admin: ["/admin"],
  erp: ["/erp"],
  pos: ["/pos"],
  hr: ["/hr"], // HR routes (all /hr/* paths)
  master: ["/master"], // Master data routes
  auth: ["/auth"], // Auth routes (all /auth/* paths)
} as const;

// Extract port from host
function getPort(host: string): string | null {
  const portMatch = host.match(/:(\d+)$/);
  return portMatch ? portMatch[1] : null;
}

// Get host without port
function getHostWithoutPort(host: string): string {
  return host.split(":")[0];
}

// Get base domain from environment or extract from host
function getBaseDomain(host: string): string {
  const hostWithoutPort = getHostWithoutPort(host);
  
  // In development, use localhost or localtest.me
  if (hostWithoutPort.includes("localhost") || hostWithoutPort.includes("127.0.0.1")) {
    return "localhost";
  }
  
  if (hostWithoutPort.includes("localtest.me")) {
    return "localtest.me";
  }

  // Use configured base domain if available
  const configuredBase = process.env.NEXT_PUBLIC_BASE_DOMAIN;
  if (configuredBase && hostWithoutPort.endsWith(configuredBase)) {
    return configuredBase;
  }
  
  // Fallback: Extract base domain (e.g., "example.com" from "hr.example.com")
  const parts = hostWithoutPort.split(".");
  if (parts.length >= 2) {
    return parts.slice(-2).join("."); // Get last two parts (e.g., "example.com")
  }
  return hostWithoutPort;
}

// Extract subdomain from host
function getSubdomain(host: string): string | null {
  const hostWithoutPort = getHostWithoutPort(host);
  
  // Handle localhost subdomains (e.g., "hr.localhost" or "hr.localhost:3001")
  if (hostWithoutPort.includes("localhost") || hostWithoutPort.includes("127.0.0.1")) {
    const parts = hostWithoutPort.split(".");
    // If it's "hr.localhost" or similar, first part is subdomain
    if (parts.length > 1 && parts[parts.length - 1] === "localhost") {
      return parts[0]; // e.g., "hr" from "hr.localhost"
    }
    return null; // Just "localhost" without subdomain
  }
  
  // Handle localtest.me subdomains (e.g., "hr.localtest.me")
  if (hostWithoutPort.includes("localtest.me")) {
    const parts = hostWithoutPort.split(".");
    // If it's "hr.localtest.me" or similar, first part is subdomain
    if (parts.length > 2 && parts[parts.length - 2] === "localtest" && parts[parts.length - 1] === "me") {
      return parts[0]; // e.g., "hr" from "hr.localtest.me"
    }
    return null; // Just "localtest.me" without subdomain
  }

  // Use configured base domain logic
  const configuredBase = process.env.NEXT_PUBLIC_BASE_DOMAIN;
  if (configuredBase && hostWithoutPort.endsWith(configuredBase)) {
    // If host is exactly the base domain, no subdomain
    if (hostWithoutPort === configuredBase) return null;
    
    // Remove base domain and trailing dot to get subdomain part
    const subdomainPart = hostWithoutPort.replace(`.${configuredBase}`, "");
    return subdomainPart;
  }
  
  // Fallback production subdomains logic
  const parts = hostWithoutPort.split(".");
  if (parts.length > 2) {
    return parts[0]; // First part is subdomain
  }
  return null;
}

// Get target subdomain for a given path
function getTargetSubdomain(pathname: string): string | null {
  for (const [subdomain, routes] of Object.entries(SUBDOMAIN_ROUTES)) {
    if (routes.some((route) => pathname.startsWith(route))) {
      return subdomain;
    }
  }
  return null;
}

// Strip subdomain prefix from path (e.g., /auth/login -> /login on auth subdomain)
function normalizePathForSubdomain(pathname: string, subdomain: string | null): string {
  if (!subdomain) return pathname;
  
  const prefix = `/${subdomain}`;
  if (pathname.startsWith(prefix)) {
    const remaining = pathname.slice(prefix.length);
    return remaining || "/"; // Return "/" if path becomes empty
  }
  
  // Special handling for auth/login
  if (subdomain === "auth" && pathname.startsWith("/auth/login")) {
    return pathname.replace("/auth", "");
  }
  
  return pathname;
}

export default function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  
  // Get current subdomain and port
  const currentSubdomain = getSubdomain(host);
  const baseDomain = getBaseDomain(host);
  const port = getPort(host);
  const isDevelopment = baseDomain === "localhost" || baseDomain === "localtest.me" || baseDomain.includes("127.0.0.1");
  
  // Helper function to determine target subdomain from callback URL
  const getCallbackSubdomain = (callbackUrl: string): string => {
    // Remove leading slash for comparison
    const cleanPath = callbackUrl.startsWith("/") ? callbackUrl.slice(1) : callbackUrl;
    
    // Master data paths
    const masterPaths = [
      "master/", "department/", "sub-department/", "institute/", "designation/", 
      "job-type/", "marital-status/", "employee-grade/", "employee-status/", 
      "qualification/", "city/", "location/", "allocation/", "loan-types/", 
      "leave-types/", "leaves-policy/", "equipment/", "salary-breakup/", 
      "eobi/", "social-security/", "tax-slabs/", "provident-fund/", 
      "bonus-types/", "allowance-head/", "deduction-head/", "banks/", "rebate-nature/"
    ];
    
    // Check for master paths
    for (const masterPath of masterPaths) {
      if (cleanPath.startsWith(masterPath)) {
        return "master";
      }
    }
    
    // Admin paths
    if (cleanPath.startsWith("admin/") || cleanPath.startsWith("activity-logs")) {
      return "admin";
    }
    
    // HR paths (default)
    return "hr";
  };
  
  // Build URL helper
  const buildUrl = (subdomain: string | null, path: string): URL => {
    const protocol = isDevelopment 
      ? (request.headers.get("x-forwarded-proto") || "http")
      : (request.headers.get("x-forwarded-proto") || "https");
    
    let hostname: string;
    if (subdomain) {
      hostname = `${subdomain}.${baseDomain}`;
    } else {
      hostname = baseDomain;
    }
    
    // Add port in development
    if (isDevelopment && port) {
      hostname = `${hostname}:${port}`;
    }
    
    return new URL(path + request.nextUrl.search, `${protocol}://${hostname}`);
  };
  
  // Special handling for auth routes - redirect to auth subdomain
  if (pathname.startsWith("/auth") && currentSubdomain !== "auth") {
    // Check if user is already authenticated
    const accessToken = request.cookies.get("accessToken")?.value;
    const isAuthenticated = !!accessToken;
    
    if (isAuthenticated) {
      // Check for callbackUrl in query parameters
      const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
      const callbackSubdomain = request.nextUrl.searchParams.get("subdomain");
      
      if (callbackUrl) {
        // Determine target subdomain for callback URL
        const targetSubdomain = callbackSubdomain || getCallbackSubdomain(callbackUrl);
        
        // Redirect to callback URL on appropriate subdomain
        const callbackRedirectUrl = buildUrl(targetSubdomain, callbackUrl);
        return NextResponse.redirect(callbackRedirectUrl);
      }
      
      // No callback URL, redirect to HR dashboard
      const dashboardUrl = buildUrl("hr", "/hr");
      return NextResponse.redirect(dashboardUrl);
    }
    
    // Redirect /auth/login to auth.localtest.me/login
    if (pathname === "/auth/login") {
      const loginUrl = buildUrl("auth", "/login");
      // Preserve query parameters
      if (request.nextUrl.search) {
        loginUrl.search = request.nextUrl.search;
      }
      return NextResponse.redirect(loginUrl);
    }
    // Redirect other auth routes to auth subdomain
    const authPath = pathname.replace("/auth", "") || "/";
    const authUrl = buildUrl("auth", authPath);
    if (request.nextUrl.search) {
      authUrl.search = request.nextUrl.search;
    }
    return NextResponse.redirect(authUrl);
  }

  // Special handling for auth subdomain routes
  if (currentSubdomain === "auth") {
    // Check if user is already authenticated
    const accessToken = request.cookies.get("accessToken")?.value;
    const isAuthenticated = !!accessToken;
    
    if (isAuthenticated) {
      // Check for callbackUrl in query parameters
      const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
      const callbackSubdomain = request.nextUrl.searchParams.get("subdomain");
      
      if (callbackUrl) {
        // Determine target subdomain for callback URL
        const targetSubdomain = callbackSubdomain || getCallbackSubdomain(callbackUrl);
        
        // Redirect to callback URL on appropriate subdomain
        const callbackRedirectUrl = buildUrl(targetSubdomain, callbackUrl);
        return NextResponse.redirect(callbackRedirectUrl);
      }
      
      // No callback URL, redirect to HR dashboard
      const dashboardUrl = buildUrl("hr", "/hr");
      return NextResponse.redirect(dashboardUrl);
    }
    
    // Handle /login -> /auth/login rewrite
    if (pathname === "/login") {
      return NextResponse.rewrite(new URL("/auth/login" + request.nextUrl.search, request.url));
    }
    // Handle other auth routes that don't have /auth prefix
    if (pathname === "/" || (!pathname.startsWith("/auth") && !pathname.startsWith("/_next") && !pathname.startsWith("/api"))) {
      // For root path on auth subdomain, redirect to login
      if (pathname === "/") {
        return NextResponse.rewrite(new URL("/auth/login" + request.nextUrl.search, request.url));
      }
      // For other paths, add /auth prefix
      const rewritePath = `/auth${pathname}`;
      return NextResponse.rewrite(new URL(rewritePath + request.nextUrl.search, request.url));
    }
  }

  // IMPORTANT: Handle routes that start with subdomain prefixes but are on wrong subdomain
  // This MUST come BEFORE the rewrite logic for other subdomains
  if (pathname.startsWith("/hr") && currentSubdomain !== "hr") {
    const hrPath = pathname.replace("/hr", "") || "/";
    const hrUrl = buildUrl("hr", hrPath);
    return NextResponse.redirect(hrUrl);
  }
  
  if (pathname.startsWith("/master") && currentSubdomain !== "master") {
    const masterPath = pathname.replace("/master", "") || "/";
    const masterUrl = buildUrl("master", masterPath);
    return NextResponse.redirect(masterUrl);
  }
  
  if (pathname.startsWith("/admin") && currentSubdomain !== "admin") {
    const adminPath = pathname.replace("/admin", "") || "/";
    const adminUrl = buildUrl("admin", adminPath);
    return NextResponse.redirect(adminUrl);
  }

  // Special handling for other subdomains (hr, admin, master)
  if (currentSubdomain && currentSubdomain !== "auth") {
    // If path doesn't start with subdomain prefix and it's not a system path
    if (!pathname.startsWith(`/${currentSubdomain}`) && !pathname.startsWith("/_next") && !pathname.startsWith("/api")) {
      // Add subdomain prefix internally for Next.js routing
      // hr.localtest.me/payroll-setup/payroll/report -> /hr/payroll-setup/payroll/report (internal)
      // But the URL stays clean: hr.localtest.me/payroll-setup/payroll/report
      const rewritePath = `/${currentSubdomain}${pathname}`;
      return NextResponse.rewrite(new URL(rewritePath + request.nextUrl.search, request.url));
    }
    
    // If path already has subdomain prefix, just continue (don't redirect)
    // This allows URLs like hr.localtest.me/hr/payroll-setup/payroll/report to work
  }

  // Determine target subdomain for this path
  const targetSubdomain = getTargetSubdomain(pathname);
  
  // Handle subdomain routing - redirect to correct subdomain if needed
  if (targetSubdomain && currentSubdomain !== targetSubdomain) {
    // Redirect to correct subdomain with normalized path
    const normalizedPath = normalizePathForSubdomain(pathname, targetSubdomain);
    const targetUrl = buildUrl(targetSubdomain, normalizedPath);
    return NextResponse.redirect(targetUrl);
  }
  
  // Legacy redirects and fallbacks
  if (currentSubdomain && !targetSubdomain) {
    // Default to HR for hr routes
    if (pathname.startsWith("/hr")) {
      const targetUrl = buildUrl("hr", pathname);
      return NextResponse.redirect(targetUrl);
    }
    // Redirect /dashboard to /hr (legacy support)
    if (pathname.startsWith("/dashboard")) {
      const hrPath = pathname.replace("/dashboard", "/hr");
      const targetUrl = buildUrl("hr", hrPath);
      return NextResponse.redirect(targetUrl);
    }
  }
  
  // Middleware reads cookies for authentication checks
  const accessToken = request.cookies.get("accessToken")?.value;
  const userRole = request.cookies.get("userRole")?.value;

  const isAuthenticated = !!accessToken;
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route)) || pathname.startsWith("/hr") || pathname.startsWith("/admin") || pathname.startsWith("/master");
  const isAdminRoute = pathname.startsWith("/admin");

  // Redirect unauthenticated users to login on auth subdomain
  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = buildUrl("auth", "/login");
    loginUrl.searchParams.set("callbackUrl", pathname);
    loginUrl.searchParams.set("subdomain", currentSubdomain || "hr");
    return NextResponse.redirect(loginUrl);
  }

  // Check admin access - redirect to admin subdomain if needed
  if (isAdminRoute && userRole !== "admin" && userRole !== "super_admin") {
    const redirectUrl = buildUrl("hr", "/hr");
    return NextResponse.redirect(redirectUrl);
  }

  // If admin route but not on admin subdomain, redirect
  if (isAdminRoute && currentSubdomain !== "admin") {
    const adminUrl = buildUrl("admin", pathname.startsWith("/admin") ? pathname : `/admin${pathname}`);
    return NextResponse.redirect(adminUrl);
  }

  // Set security headers
  const response = NextResponse.next();
  
  // Backend handles cookie setting with proper domain configuration
  
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  // CSP: Allow API calls to localhost in development
  // ⭐ IMPORTANT: connect-src must come BEFORE default-src to override it
  const cspDirective = isDevelopment
    ? "connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:*; default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: http://localhost:*; font-src 'self' data:;"
    : "connect-src 'self'; default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;";
  
  response.headers.set("Content-Security-Policy", cspDirective);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)",
  ],
};

