"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_BASE = process.env.API_URL || "http://localhost:5000/api";

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string | null;
  permissions: string[];
}

export interface AuthResponse {
  status: boolean;
  message: string;
  data?: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

// Decode JWT token to check expiration (without verification, just for reading)
// JWT format: header.payload.signature - we only need the payload
function decodeToken(token: string): { exp?: number; iat?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode base64url payload (JWT uses base64url encoding)
    const payload = parts[1];
    // Replace URL-safe base64 characters
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    // Decode base64
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as { exp?: number; iat?: number };
    return parsed;
  } catch {
    return null;
  }
}

// Check if token is already expired (SECURITY: Never refresh expired tokens)
function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return true;

  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const now = Date.now();

  // Return true if token is already expired
  return now >= expirationTime;
}

// Check if token is expiring soon but still valid (within 30 minutes)
// SECURITY: Only refresh if token is still valid (not expired)
function isTokenExpiringSoon(token: string | null | undefined): boolean {
  if (!token) return false;

  // SECURITY: If token is already expired, don't refresh
  if (isTokenExpired(token)) return false;

  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return false;

  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds

  // Return true only if token is still valid AND expires within 30 minutes
  return expirationTime - now < thirtyMinutes && expirationTime > now;
}

// Login action - for server-side use, calls backend directly
// For client-side login, use loginClient from client-auth.ts
export async function login(formData: FormData): Promise<{
  status: boolean;
  message: string;
}> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { status: false, message: "Email and password are required" };
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    const data: AuthResponse = await res.json();

    if (data.status && data.data) {
      // Note: This server action cannot set cookies in the browser
      // Use loginClient from client-auth.ts for proper cookie handling
      return {
        status: true,
        message: "Login successful"
      };
    }

    return { status: false, message: data.message || "Login failed" };
  } catch (error) {
    console.error("Login error:", error);
    return { status: false, message: "Failed to connect to server" };
  }
}

// Logout action - now calls Next.js API route
export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      credentials: "include",
    });
  } catch (error) {
    console.error("Logout error:", error);
  }

  redirect("/login");
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user")?.value;

  if (userCookie) {
    try {
      return JSON.parse(userCookie);
    } catch {
    }
  }

  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: "include",
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.status || !data.data) return null;

    const apiUser = data.data;
    const permissions =
      apiUser.role?.permissions?.map((p: any) => p.permission?.name).filter(Boolean) ?? [];

    return {
      id: apiUser.id,
      email: apiUser.email,
      firstName: apiUser.firstName,
      lastName: apiUser.lastName,
      role: apiUser.role?.name ?? null,
      permissions,
    };
  } catch {
    return null;
  }
}

// Get access token (with automatic refresh if needed)
// SECURITY: Never refresh expired tokens
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get("accessToken")?.value || null;
  const refreshToken = cookieStore.get("refreshToken")?.value || null;

  // SECURITY CHECK: If access token is expired, don't return it
  if (accessToken && isTokenExpired(accessToken)) {
    // Token is expired - clear it (security: expired tokens are invalid)
    cookieStore.delete("accessToken");
    accessToken = null;
  }

  // If no access token but have refresh token, try to refresh (only if refresh token is valid)
  if (!accessToken && refreshToken) {
    // SECURITY: Only refresh if refresh token is not expired
    if (!isTokenExpired(refreshToken)) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        accessToken = (await cookies()).get("accessToken")?.value || null;
      }
    } else {
      // Refresh token expired, clear everything
      cookieStore.delete("accessToken");
      cookieStore.delete("refreshToken");
      cookieStore.delete("userRole");
      cookieStore.delete("user");
    }
    return accessToken;
  }

  // If access token exists and is expiring soon (but still valid), proactively refresh
  if (accessToken && isTokenExpiringSoon(accessToken)) {
    if (refreshToken && !isTokenExpired(refreshToken)) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        accessToken = (await cookies()).get("accessToken")?.value || null;
      }
    }
  }

  return accessToken;
}

// Refresh token - calls backend directly for server-side use
// For client-side refresh, use refreshTokenClient from client-auth.ts
export async function refreshAccessToken(): Promise<boolean> {
  // Stateless refresh is handled by the Client Component auth-provider.tsx.
  return false;
}

import axios from "axios";

// Authenticated fetch helper (NextAuth-like with proactive refresh)
// SECURITY: Never use expired tokens, never refresh expired tokens
export async function authFetch(url: string, options: any = {}): Promise<any> {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get("accessToken")?.value || null;

  // SECURITY CHECK 1: If access token is expired, don't use it
  if (accessToken && isTokenExpired(accessToken)) {
    cookieStore.delete("accessToken");
    accessToken = null;
  }

  const companyCookie = cookieStore.get("currentCompany")?.value;
  const companyCode = cookieStore.get("companyCode")?.value;
  let companyId = "";

  if (companyCookie) {
    try {
      const company = JSON.parse(companyCookie);
      companyId = company.id;
    } catch (e) { }
  }

  try {
    const response = await axios({
      url: `${API_BASE}${url}`,
      method: options.method || 'GET',
      data: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(companyId ? { "x-company-id": companyId } : {}),
        ...(companyCode ? { "x-tenant-id": companyCode } : {}),
        ...options.headers,
      },
      withCredentials: true,
      // Adapt axios response to look like fetch response for compatibility
    });

    return {
      ok: true,
      status: response.status,
      json: async () => response.data,
      text: async () => JSON.stringify(response.data),
    };
  } catch (error: any) {
    return {
      ok: false,
      status: error.response?.status || 500,
      json: async () => error.response?.data || { message: error.message },
      text: async () => JSON.stringify(error.response?.data || { message: error.message }),
    };
  }
}

// Change password
export async function changePassword(formData: FormData): Promise<{ status: boolean; message: string }> {
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!currentPassword || !newPassword) {
    return { status: false, message: "All fields are required" };
  }

  try {
    const response = await authFetch("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await response.json();
    return { status: data.status, message: data.message };
  } catch (error) {
    console.error("Change password error:", error);
    return { status: false, message: "Failed to change password" };
  }
}

// Check permission helper
export async function hasPermission(permission: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.permissions.includes(permission);
}

// Check session validity (NextAuth-like with proactive refresh)
// SECURITY: Never validate expired tokens, never refresh expired tokens
export async function checkSession(): Promise<{ valid: boolean; user?: User }> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return { valid: false };

    const res = await fetch(`${API_BASE}/auth/check-session`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      const user = await getCurrentUser();
      return { valid: data.status && data.valid !== false, user: user || undefined };
    }

    return { valid: false };
  } catch (error) {
    console.error("Session check error:", error);
    return { valid: false };
  }
}
