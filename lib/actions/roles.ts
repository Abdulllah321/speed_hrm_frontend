"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.API_URL || "http://localhost:5000/api";

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
  permissions?: {
    permission: {
      id: string;
      name: string;
      module: string;
      action: string;
    };
  }[];
  _count?: {
    users: number;
  };
}

export async function getRoles(): Promise<{ status: boolean; data: Role[]; message?: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/roles`, {
      cache: "no-store",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return { status: true, data };
      }
    }
    // Fallback: /auth/roles (Jwt only, no PermissionsGuard)
    const res2 = await fetch(`${API_BASE}/auth/roles`, {
      cache: "no-store",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    if (res2.ok) {
      const payload = await res2.json();
      const roles = Array.isArray(payload?.data) ? payload.data : [];
      return { status: true, data: roles };
    }
    return { status: false, data: [], message: "Unable to load roles" };
  } catch (error) {
    console.error("Failed to fetch roles:", error);
    return { status: false, data: [], message: "Failed to fetch roles" };
  }
}

export async function getRoleById(id: string): Promise<{ status: boolean; data: Role | null }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/roles/${id}`, {
      cache: "no-store",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });

    if (!res.ok) {
      if (res.status === 404) return { status: false, data: null };
      const error = await res.json().catch(() => ({}));
      console.error(`Failed to fetch role: ${res.status}`, error);
      return { status: false, data: null };
    }

    const data = await res.json();
    return { status: true, data };
  } catch (error) {
    console.error("Failed to fetch role:", error);
    return { status: false, data: null };
  }
}

export async function createRole(data: { name: string; description?: string; permissionIds?: string[] }) {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/roles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      return { status: false, message: error.message || "Failed to create role" };
    }

    revalidatePath("/admin/roles");
    return { status: true, message: "Role created successfully" };
  } catch (error) {
    return { status: false, message: "Failed to create role" };
  }
}

export async function updateRole(id: string, data: { name?: string; description?: string; permissionIds?: string[] }) {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/roles/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      return { status: false, message: error.message || "Failed to update role" };
    }

    revalidatePath("/admin/roles");
    return { status: true, message: "Role updated successfully" };
  } catch (error) {
    return { status: false, message: "Failed to update role" };
  }
}

export async function deleteRole(id: string) {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/roles/${id}`, {
      method: "DELETE",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });

    if (!res.ok) {
      const error = await res.json();
      return { status: false, message: error.message || "Failed to delete role" };
    }

    revalidatePath("/admin/roles");
    return { status: true, message: "Role deleted successfully" };
  } catch (error) {
    return { status: false, message: "Failed to delete role" };
  }
}
