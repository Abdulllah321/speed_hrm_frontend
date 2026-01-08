"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export interface Bank {
  id: string;
  name: string;
  code?: string | null;
  accountNumberPrefix?: string | null;
  status: string;
  createdById?: string | null;
  updatedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getBanks(): Promise<{ status: boolean; data: Bank[] }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/banks`, {
      cache: "no-store",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch banks:", error);
    return { status: false, data: [] };
  }
}

export async function createBanks(items: { name: string; code?: string; accountNumberPrefix?: string }[]): Promise<{ status: boolean; message: string }> {
  if (!items.length) return { status: false, message: "At least one bank is required" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/banks/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/master/banks");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create banks" };
  }
}

export async function updateBank(id: string, formData: FormData): Promise<{ status: boolean; message: string; data?: Bank }> {
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const accountNumberPrefix = formData.get("accountNumberPrefix") as string;
  const status = formData.get("status") as string;

  if (!name?.trim()) return { status: false, message: "Name is required" };

  const payload: any = { id, name };
  if (code) payload.code = code;
  if (accountNumberPrefix) payload.accountNumberPrefix = accountNumberPrefix;
  if (status) payload.status = status;

  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/banks/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/master/banks");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update bank" };
  }
}

export async function deleteBank(id: string): Promise<{ status: boolean; message: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/banks/${id}`, {
      method: "DELETE",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    const data = await res.json();
    if (data.status) revalidatePath("/master/banks");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete bank" };
  }
}

export async function deleteBanks(ids: string[]): Promise<{ status: boolean; message: string }> {
  if (!ids.length) return { status: false, message: "No items to delete" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/banks/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/master/banks");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete banks" };
  }
}

export async function updateBanks(items: { id: string; name: string; code?: string; accountNumberPrefix?: string; status?: string }[]): Promise<{ status: boolean; message: string }> {
  if (!items.length) return { status: false, message: "No items to update" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/banks/bulk`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/master/banks");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update banks" };
  }
}

