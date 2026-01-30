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