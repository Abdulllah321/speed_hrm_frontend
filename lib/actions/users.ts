"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.API_URL || "http://localhost:5000/api";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roleId?: string;
  role?: {
    id: string;
    name: string;
  };
  employeeId?: string;
  employee?: {
    id: string;
    employeeName: string;
    designation?: { name: string };
    department?: { name: string };
  };
}

export async function getUsers(): Promise<{ status: boolean; data: User[]; message?: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/auth/users`, {
      cache: "no-store",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    const payload = await res.json();
    const users = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
    return { status: true, data: users };
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return { status: false, data: [], message: "Failed to fetch users" };
  }
}

export async function createUser(data: {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  employeeId?: string;
  roleId?: string
}) {
  try {
    // Default password if not provided
    const payload = {
      ...data,
      password: data.password || "Password@123" // Default password
    };

    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/auth/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let message = "Failed to create user";
      try {
        const error = await res.json();
        message = error.message || message;
      } catch {
        try {
          const text = await res.text();
          // Common server message when route not found
          message = text || message;
        } catch { }
      }
      return { status: false, message };
    }

    revalidatePath("/hr/employee/user-account");
    return { status: true, message: "User account created successfully" };
  } catch (error) {
    return { status: false, message: "Failed to create user account" };
  }
}

export async function updateUserRole(userId: string, roleId: string | null) {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/auth/users/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        id: userId,
        data: { roleId }
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      return { status: false, message: error.message || "Failed to update user role" };
    }

    revalidatePath("/hr/employee/user-account");
    return { status: true, message: "User role updated successfully" };
  } catch (error) {
    return { status: false, message: "Failed to update user role" };
  }
}
