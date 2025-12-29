"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export interface MaritalStatus {
  id: string;
  name: string;
  status: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getMaritalStatuses(): Promise<{ status: boolean; data: MaritalStatus[]; message?: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/marital-statuses`, {
      cache: "no-store",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch marital statuses:", error);
    return { status: false, data: [], message: "Failed to fetch marital statuses" };
  }
}

export async function getMaritalStatusById(id: string): Promise<{ status: boolean; data: MaritalStatus | null }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/marital-statuses/${id}`, {
      cache: "no-store",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch marital status:", error);
    return { status: false, data: null };
  }
}

export async function createMaritalStatus(formData: FormData): Promise<{ status: boolean; message: string; data?: MaritalStatus }> {
  const name = formData.get("name") as string;
  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/marital-statuses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.status) {
      revalidatePath("/dashboard/master/marital-status");
    }
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create marital status" };
  }
}

export async function createMaritalStatuses(names: string[]): Promise<{ status: boolean; message: string }> {
  if (!names.length) {
    return { status: false, message: "At least one name is required" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/marital-statuses/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ names }),
    });
    const data = await res.json();
    if (data.status) {
      revalidatePath("/dashboard/master/marital-status");
    }
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create marital statuses" };
  }
}

export async function updateMaritalStatus(id: string, formData: FormData): Promise<{ status: boolean; message: string; data?: MaritalStatus }> {
  const name = formData.get("name") as string;
  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/marital-statuses/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ id, name }),
    });
    const data = await res.json();
    if (data.status) {
      revalidatePath("/dashboard/master/marital-status");
    }
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update marital status" };
  }
}

export async function deleteMaritalStatus(id: string): Promise<{ status: boolean; message: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/marital-statuses/${id}`, {
      method: "DELETE",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    const data = await res.json();
    if (data.status) {
      revalidatePath("/dashboard/master/marital-status");
    }
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete marital status" };
  }
}

export async function deleteMaritalStatuses(ids: string[]): Promise<{ status: boolean; message: string }> {
  if (!ids.length) {
    return { status: false, message: "No items to delete" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/marital-statuses/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (data.status) {
      revalidatePath("/dashboard/master/marital-status");
    }
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete marital statuses" };
  }
}

export async function updateMaritalStatuses(items: { id: string; name: string }[]): Promise<{ status: boolean; message: string }> {
  if (!items.length) {
    return { status: false, message: "No items to update" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/marital-statuses/bulk`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) {
      revalidatePath("/dashboard/master/marital-status");
    }
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update marital statuses" };
  }
}

