"use server";

import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.API_URL || "http://localhost:5000/api";

export interface Permission {
  id: string;
  name: string;
  module: string;
  action: string;
  description?: string;
}

export async function getPermissions(): Promise<{ status: boolean; data: Permission[]; message?: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/permissions`, {
      cache: "force-cache", // Permissions rarely change
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    const data = await res.json();
    return { status: true, data: Array.isArray(data) ? data : [] };
  } catch (error) {
    console.error("Failed to fetch permissions:", error);
    return { status: false, data: [], message: "Failed to fetch permissions" };
  }
}
