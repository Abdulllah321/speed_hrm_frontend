"use client";

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string | null;
  permissions: string[];
}

// Client-side login function
export async function loginClient(email: string, password: string): Promise<{ 
  status: boolean; 
  message: string;
  user?: User;
}> {
  if (!email || !password) {
    return { status: false, message: "Email and password are required" };
  }

  try {
    const res = await fetch("/api/auth/login", {
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

// Client-side logout function
export async function logoutClient(): Promise<{ status: boolean; message: string }> {
  try {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    return { status: data.status, message: data.message };
  } catch (error) {
    console.error("Logout error:", error);
    return { status: false, message: "Logout failed" };
  }
}

// Client-side token refresh function
export async function refreshTokenClient(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    return data.status;
  } catch (error) {
    console.error("Token refresh error:", error);
    return false;
  }
}