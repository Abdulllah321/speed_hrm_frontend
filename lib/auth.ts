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
        maxAge: 15 * 60, // 15 minutes (matches JWT expiry)
        path: "/",
      });

      cookieStore.set("refreshToken", data.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60, // 1 day session
        path: "/",
      });

      // Set user info (non-sensitive) for client access
      cookieStore.set("userRole", data.data.user.role || "user", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60, // 1 day
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
        maxAge: 24 * 60 * 60, // 1 day
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

// Get access token
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("accessToken")?.value || null;
}

// Refresh token
export async function refreshAccessToken(): Promise<boolean> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await res.json();

    if (data.status && data.data) {
      cookieStore.set("accessToken", data.data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60, // 15 minutes
        path: "/",
      });

      cookieStore.set("refreshToken", data.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60, // 1 day
        path: "/",
      });

      return true;
    }
  } catch (error) {
    console.error("Token refresh error:", error);
  }

  return false;
}

// Authenticated fetch helper
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get("accessToken")?.value;

  const makeRequest = async (token: string | undefined) => {
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

  // If token expired, try to refresh
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      accessToken = (await cookies()).get("accessToken")?.value;
      response = await makeRequest(accessToken);
    }
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

// Check session validity
export async function checkSession(): Promise<{ valid: boolean }> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) {
    return { valid: false };
  }

  try {
    const res = await fetch(`${API_BASE}/auth/check-session`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 401) {
      // Try to refresh
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        // Clear cookies on failed refresh
        cookieStore.delete("accessToken");
        cookieStore.delete("refreshToken");
        cookieStore.delete("userRole");
        cookieStore.delete("user");
        return { valid: false };
      }
      return { valid: true };
    }

    const data = await res.json();
    return { valid: data.status && data.valid };
  } catch (error) {
    console.error("Session check error:", error);
    return { valid: false };
  }
}

