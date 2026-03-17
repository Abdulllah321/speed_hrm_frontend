
import { getApiBaseUrl } from "./utils";

const API_BASE = getApiBaseUrl();

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
function decodeToken(token: string): { exp?: number; iat?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    const decoded = typeof window === 'undefined' 
      ? Buffer.from(padded, 'base64').toString('utf-8')
      : atob(padded);
    
    const parsed = JSON.parse(decoded) as { exp?: number; iat?: number };
    return parsed;
  } catch {
    return null;
  }
}

// Check if token is already expired
function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return Date.now() >= decoded.exp * 1000;
}

// Check if token is expiring soon but still valid (within 30 minutes)
function isTokenExpiringSoon(token: string | null | undefined): boolean {
  if (!token) return false;
  if (isTokenExpired(token)) return false;
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return false;
  const expirationTime = decoded.exp * 1000;
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;
  return expirationTime - now < thirtyMinutes && expirationTime > now;
}

export async function getCurrentUser(): Promise<User | null> {
  if (typeof window === 'undefined') {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user")?.value;

    if (userCookie) {
      try {
        return JSON.parse(userCookie);
      } catch {}
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
export async function getAccessToken(): Promise<string | null> {
  let accessToken: string | null = null;
  let refreshToken: string | null = null;

  if (typeof window === 'undefined') {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    accessToken = cookieStore.get("accessToken")?.value || null;
    refreshToken = cookieStore.get("refreshToken")?.value || null;

    if (accessToken && isTokenExpired(accessToken)) {
      cookieStore.delete("accessToken");
      accessToken = null;
    }
  } else {
    // Client-side: parse document.cookie
    const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
        return null;
    };
    accessToken = getCookie("accessToken");
    refreshToken = getCookie("refreshToken");
  }

  return accessToken;
}

import axios from "axios";

// Authenticated fetch helper - works on both server and client
export async function authFetch(url: string, options: any = {}): Promise<any> {
  const BASE_URL = getApiBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;

  if (typeof window === 'undefined') {
    // Server-side
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    let accessToken = cookieStore.get("accessToken")?.value || null;

    if (accessToken && isTokenExpired(accessToken)) {
      // Note: we can't delete cookies here if it's not a server action
      // but we can treat it as null for the request
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

    const allCookies = cookieStore.getAll();
    const cookieHeader = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[authFetch Server] ${options.method || 'GET'} ${fullUrl}`);
      }

      const response = await axios({
        url: fullUrl,
        method: options.method || 'GET',
        data: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...(companyId ? { "x-company-id": companyId } : {}),
          ...(companyCode ? { "x-tenant-id": companyCode } : {}),
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          ...options.headers,
        },
        withCredentials: true,
        timeout: 8000, // 8-second timeout to prevent hanging in production
      });

      return {
        ok: true,
        status: response.status,
        data: response.data,
      };
    } catch (error: any) {
      console.error(`[authFetch Server Error] ${options.method || 'GET'} ${fullUrl}:`, error.message);
      
      return {
        ok: false,
        status: error.response?.status || 500,
        data: error.response?.data || { message: error.message },
      };
    }
  } else {
    // Client-side
    const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
        return null;
    };
    const companyId = getCookie("companyId") || getCookie("currentCompany") ? (() => {
        try {
            const c = getCookie("currentCompany");
            return c ? JSON.parse(decodeURIComponent(c)).id : null;
        } catch { return null; }
    })() : null;
    const companyCode = getCookie("companyCode");

    try {
        const response = await axios({
            url: fullUrl,
            method: options.method || 'GET',
            data: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined,
            headers: {
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...(companyId ? { "x-company-id": companyId } : {}),
                ...(companyCode ? { "x-tenant-id": companyCode } : {}),
                ...options.headers,
            },
            withCredentials: true,
        });

        return {
            ok: true,
            status: response.status,
            data: response.data,
        };
    } catch (error: any) {
        return {
            ok: false,
            status: error.response?.status || 500,
            data: error.response?.data || { message: error.message },
        };
    }
  }
}

// Check permission helper
export async function hasPermission(permission: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.permissions.includes(permission);
}

// Check session validity
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
