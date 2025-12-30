"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export interface EOBI {
  id: string;
  name: string;
  amount: number;
  yearMonth: string;
  status: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getEOBIs(): Promise<{ status: boolean; data: EOBI[] }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/eobis`, {
      cache: "no-store",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch EOBIs:", error);
    return { status: false, data: [] };
  }
}

export async function createEOBI(formData: FormData): Promise<{ status: boolean; message: string; data?: EOBI }> {
  const name = formData.get("name") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const yearMonth = formData.get("yearMonth") as string;

  if (!name?.trim() || isNaN(amount) || !yearMonth?.trim()) {
    return { status: false, message: "All fields are required" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/eobis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name, amount, yearMonth }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/eobi");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create EOBI" };
  }
}

export async function createEOBIs(
  items: { name: string; amount: number; yearMonth: string }[]
): Promise<{ status: boolean; message: string }> {
  if (!items.length) return { status: false, message: "At least one EOBI is required" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/eobis/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/eobi");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create EOBIs" };
  }
}

export async function updateEOBI(id: string, formData: FormData): Promise<{ status: boolean; message: string; data?: EOBI }> {
  const name = formData.get("name") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const yearMonth = formData.get("yearMonth") as string;

  if (!name?.trim()) return { status: false, message: "Name is required" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/eobis/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ id, name, amount, yearMonth }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/eobi");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update EOBI" };
  }
}

export async function deleteEOBI(id: string): Promise<{ status: boolean; message: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/eobis/${id}`, {
      method: "DELETE",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/eobi");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete EOBI" };
  }
}

export async function deleteEOBIs(ids: string[]): Promise<{ status: boolean; message: string }> {
  if (!ids.length) return { status: false, message: "No items to delete" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/eobis/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/eobi");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete EOBIs" };
  }
}

export async function updateEOBIs(
  items: { id: string; name: string; amount: number; yearMonth: string }[]
): Promise<{ status: boolean; message: string }> {
  if (!items.length) return { status: false, message: "No items to update" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/eobis/bulk`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/eobi");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update EOBIs" };
  }
}

