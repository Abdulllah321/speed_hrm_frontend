"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_BASE = process.env.API_URL || "http://localhost:5000/api";
console.log(API_BASE);

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

// Login action
export async function login(formData: FormData): Promise<{ status: boolean; message: string }> {
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
    });

    const data: AuthResponse = await res.json();

    if (data.status && data.data) {
      const cookieStore = await cookies();
      
      // Set HTTP-only cookies for tokens
      cookieStore.set("accessToken", data.data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 2 * 60 * 60, // 2 hours (matches JWT expiry)
        path: "/",
      });

      cookieStore.set("refreshToken", data.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days to match backend refresh token expiry
        path: "/",
      });

      // Set user info (non-sensitive) for client access
      cookieStore.set("userRole", data.data.user.role || "user", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days to match refresh token
        path: "/",
      });

      cookieStore.set("user", JSON.stringify({
        id: data.data.user.id,
        email: data.data.user.email,
        firstName: data.data.user.firstName,
        lastName: data.data.user.lastName,
        role: data.data.user.role,
        permissions: data.data.user.permissions,
      }), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days to match refresh token
        path: "/",
      });

      return { status: true, message: "Login successful" };
    }

    return { status: false, message: data.message || "Login failed" };
  } catch (error) {
    console.error("Login error:", error);
    return { status: false, message: "Failed to connect to server" };
  }
}

// Logout action
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  try {
    if (accessToken) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }
  } catch (error) {
    console.error("Logout error:", error);
  }

  // Clear all auth cookies
  cookieStore.delete("accessToken");
  cookieStore.delete("refreshToken");
  cookieStore.delete("userRole");
  cookieStore.delete("user");

  redirect("/login");
}

// Get current user from cookie
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user")?.value;

  if (!userCookie) return null;

  try {
    return JSON.parse(userCookie);
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

// Refresh token (NextAuth-like approach with security checks)
// SECURITY: Never refresh if tokens are expired
export async function refreshAccessToken(): Promise<boolean> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value || null;
  const accessToken = cookieStore.get("accessToken")?.value || null;

  if (!refreshToken) return false;

  // SECURITY CHECK 1: Verify refresh token is not expired
  if (isTokenExpired(refreshToken)) {
    // Refresh token expired, clear everything (security: expired tokens cannot be refreshed)
    cookieStore.delete("accessToken");
    cookieStore.delete("refreshToken");
    cookieStore.delete("userRole");
    cookieStore.delete("user");
    return false;
  }

  // SECURITY CHECK 2: If access token exists and is expired, don't refresh
  // This prevents refreshing with an expired access token
  if (accessToken && isTokenExpired(accessToken)) {
    // Access token is expired - this is expected, but we only refresh if refresh token is valid
    // The refresh token check above already passed, so we can proceed
  }

  try {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await res.json();

    if (data.status && data.data) {
      // SECURITY CHECK 3: Verify new tokens are valid before storing
      const newAccessToken = data.data.accessToken;
      const newRefreshToken = data.data.refreshToken;

      // Validate new tokens are not expired (shouldn't happen, but security check)
      if (isTokenExpired(newAccessToken) || isTokenExpired(newRefreshToken)) {
        console.error("Security: Received expired tokens from refresh endpoint");
        cookieStore.delete("accessToken");
        cookieStore.delete("refreshToken");
        cookieStore.delete("userRole");
        cookieStore.delete("user");
        return false;
      }

      cookieStore.set("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 2 * 60 * 60, // 2 hours (matches backend access token expiry)
        path: "/",
      });

      cookieStore.set("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days to match backend refresh token expiry
        path: "/",
      });

      return true;
    }
  } catch (error) {
    console.error("Token refresh error:", error);
  }

  // If refresh failed, clear tokens (security: failed refresh = invalid session)
  cookieStore.delete("accessToken");
  cookieStore.delete("refreshToken");
  cookieStore.delete("userRole");
  cookieStore.delete("user");

  return false;
}

// Authenticated fetch helper (NextAuth-like with proactive refresh)
// SECURITY: Never use expired tokens, never refresh expired tokens
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get("accessToken")?.value || null;
  const refreshToken = cookieStore.get("refreshToken")?.value || null;

  // SECURITY CHECK 1: If access token is expired, don't use it
  if (accessToken && isTokenExpired(accessToken)) {
    cookieStore.delete("accessToken");
    accessToken = null;
  }

  // SECURITY CHECK 2: Proactive refresh only if token is valid but expiring soon
  // Never refresh if token is already expired
  if (accessToken && isTokenExpiringSoon(accessToken) && refreshToken) {
    // Only refresh if refresh token is also valid (not expired)
    if (!isTokenExpired(refreshToken)) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        accessToken = (await cookies()).get("accessToken")?.value || null;
      }
    }
  }

  const makeRequest = async (token: string | null) => {
    return fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  };

  let response = await makeRequest(accessToken);

  // SECURITY CHECK 3: If token expired (401), try to refresh ONLY if refresh token is valid
  if (response.status === 401) {
    if (refreshToken && !isTokenExpired(refreshToken)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
        accessToken = (await cookies()).get("accessToken")?.value || null;
        // SECURITY: Verify new token is not expired before using
        if (accessToken && !isTokenExpired(accessToken)) {
      response = await makeRequest(accessToken);
    }
      }
    }
    // If refresh token is expired or refresh failed, return 401 (security: expired = no access)
  }

  return response;
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
  const cookieStore = await cookies();
  let accessToken = cookieStore.get("accessToken")?.value || null;
  const refreshToken = cookieStore.get("refreshToken")?.value || null;

  // If no tokens, session is invalid
  if (!accessToken && !refreshToken) {
    return { valid: false };
  }

  // SECURITY CHECK 1: If access token is expired, clear it immediately
  if (accessToken && isTokenExpired(accessToken)) {
    cookieStore.delete("accessToken");
    accessToken = null;
  }

  // SECURITY CHECK 2: Proactive refresh only if token is valid but expiring soon
  // Never refresh if token is already expired
  if (accessToken && isTokenExpiringSoon(accessToken) && refreshToken) {
    // Only refresh if refresh token is also valid (not expired)
    if (!isTokenExpired(refreshToken)) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        accessToken = (await cookies()).get("accessToken")?.value || null;
      } else {
        return { valid: false };
      }
    } else {
      // Refresh token expired, clear everything
      cookieStore.delete("accessToken");
      cookieStore.delete("refreshToken");
      cookieStore.delete("userRole");
      cookieStore.delete("user");
      return { valid: false };
    }
  }

  // If still no access token but have refresh token, try to get new access token
  if (!accessToken && refreshToken) {
    // SECURITY: Only refresh if refresh token is not expired
    if (!isTokenExpired(refreshToken)) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        accessToken = (await cookies()).get("accessToken")?.value || null;
      } else {
        return { valid: false };
      }
    } else {
      // Refresh token expired, clear everything (security: expired = invalid)
      cookieStore.delete("accessToken");
      cookieStore.delete("refreshToken");
      cookieStore.delete("userRole");
      cookieStore.delete("user");
      return { valid: false };
    }
  }

  if (!accessToken) {
    return { valid: false };
  }

  // SECURITY CHECK 3: Final validation - ensure token is not expired before API call
  if (isTokenExpired(accessToken)) {
    cookieStore.delete("accessToken");
    cookieStore.delete("refreshToken");
    cookieStore.delete("userRole");
    cookieStore.delete("user");
    return { valid: false };
  }

  try {
    const res = await fetch(`${API_BASE}/auth/check-session`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 401) {
      // Token expired on server, try to refresh ONLY if refresh token is valid
      if (refreshToken && !isTokenExpired(refreshToken)) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        // Clear cookies on failed refresh
        cookieStore.delete("accessToken");
        cookieStore.delete("refreshToken");
        cookieStore.delete("userRole");
        cookieStore.delete("user");
        return { valid: false };
      }
        // Retry with new token
        const newToken = (await cookies()).get("accessToken")?.value || null;
        if (newToken && !isTokenExpired(newToken)) {
          const retryRes = await fetch(`${API_BASE}/auth/check-session`, {
            headers: { Authorization: `Bearer ${newToken}` },
          });
          if (retryRes.ok) {
            const user = await getCurrentUser();
            return { valid: true, user: user || undefined };
    }
        }
      }
      // If refresh token is expired or refresh failed, session is invalid
      cookieStore.delete("accessToken");
      cookieStore.delete("refreshToken");
      cookieStore.delete("userRole");
      cookieStore.delete("user");
      return { valid: false };
    }

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
