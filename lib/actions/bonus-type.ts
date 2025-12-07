"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export interface BonusType {
  id: string;
  name: string;
  status: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getBonusTypes(): Promise<{ status: boolean; data: BonusType[] }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/bonus-types`, {
      cache: "no-store",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch bonus types:", error);
    return { status: false, data: [] };
  }
}

export async function createBonusType(formData: FormData): Promise<{ status: boolean; message: string; data?: BonusType }> {
  const name = formData.get("name") as string;
  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/bonus-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/bonus-types");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create bonus type" };
  }
}

export async function createBonusTypes(items: { name: string }[]): Promise<{ status: boolean; message: string }> {
  if (!items.length) return { status: false, message: "At least one bonus type is required" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/bonus-types/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/bonus-types");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create bonus types" };
  }
}

export async function updateBonusType(id: string, formData: FormData): Promise<{ status: boolean; message: string; data?: BonusType }> {
  const name = formData.get("name") as string;
  if (!name?.trim()) return { status: false, message: "Name is required" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/bonus-types/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/bonus-types");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update bonus type" };
  }
}

export async function deleteBonusType(id: string): Promise<{ status: boolean; message: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/bonus-types/${id}`, {
      method: "DELETE",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/bonus-types");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete bonus type" };
  }
}

export async function deleteBonusTypes(ids: string[]): Promise<{ status: boolean; message: string }> {
  if (!ids.length) return { status: false, message: "No items to delete" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/bonus-types/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/bonus-types");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete bonus types" };
  }
}

export async function updateBonusTypes(items: { id: string; name: string }[]): Promise<{ status: boolean; message: string }> {
  if (!items.length) return { status: false, message: "No items to update" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/bonus-types/bulk`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/bonus-types");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update bonus types" };
  }
}

