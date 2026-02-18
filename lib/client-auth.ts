"use client";

import { getApiBaseUrl } from "./utils";


export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string | null;
  permissions: string[];
}

// Client-side login function - now calls backend directly
export async function loginClient(email: string, password: string): Promise<{
  status: boolean;
  message: string;
  user?: User;
}> {
  if (!email || !password) {
    return { status: false, message: "Email and password are required" };
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include", // Important for cookies
    });

    const data = await res.json();

    if (data.status) {
      return {
        status: true,
        message: "Login successful",
        user: data.data?.user
      };
    }

    return { status: false, message: data.message || "Login failed" };
  } catch (error) {
    console.error("Login error:", error);
    return { status: false, message: "Failed to connect to server" };
  }
}

// Client-side POS login function
export async function getPosContext(
  code?: string,
  lat?: number,
  lng?: number,
): Promise<{ status: boolean; message: string; data?: any }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/pos/context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, lat, lng }),
    });
    return res.json();
  } catch (error) {
    return { status: false, message: "Network error" };
  }
}

export async function posLoginClient(terminalCode: string, pin: string): Promise<{
  status: boolean;
  message: string;
  data?: any;
}> {
  if (!terminalCode || !pin) {
    return { status: false, message: "Terminal Code and PIN are required" };
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/pos-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terminalCode, pin }),
      credentials: "include",
    });

    const data = await res.json();

    if (data.status) {
      return {
        status: true,
        message: "POS Authentication successful",
        data: data.data
      };
    }

    return { status: false, message: data.message || "POS Authentication failed" };
  } catch (error) {
    console.error("POS Login error:", error);
    return { status: false, message: "Failed to connect to server" };
  }
}

// Client-side logout function - now calls backend directly
export async function logoutClient(): Promise<{ status: boolean; message: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      credentials: "include",
    });

    const data = await res.json();
    return { status: data.status, message: data.message };
  } catch (error) {
    console.error("Logout error:", error);
    return { status: false, message: "Logout failed" };
  }
}

// Client-side token refresh function - now calls backend directly
export async function refreshTokenClient(): Promise<boolean> {
  try {
    // Get refresh token from cookie (sent automatically with credentials: include)
    const res = await fetch(`${getApiBaseUrl()}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}), // Backend will get refreshToken from cookie
    });

    const data = await res.json();
    return data.status;
  } catch (error) {
    console.error("Token refresh error:", error);
    return false;
  }
}

export async function loginPosUser(email: string, pass: string): Promise<{ status: boolean; message: string; data?: any }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/pos/user-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, pass }),
      credentials: "include",
    });
    return res.json();
  } catch (error) {
    return { status: false, message: "Network error" };
  }
}

// Get all active profiles on this browser
export async function getAvailableProfilesClient(): Promise<User[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/profiles`, {
      method: "GET",
      credentials: "include",
    });
    const data = await res.json();
    if (data && data.status && Array.isArray(data.data)) {
      return data.data;
    }
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Fetch profiles error:", error);
    return [];
  }
}

export async function switchPosSessionClient(): Promise<{ status: boolean; message: string; data?: any }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/pos/switch-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return res.json();
  } catch (error) {
    return { status: false, message: "Network error" };
  }
}