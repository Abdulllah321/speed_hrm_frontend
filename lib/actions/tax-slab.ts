"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export interface TaxSlab {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  rate: number;
  status: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getTaxSlabs(): Promise<{ status: boolean; data: TaxSlab[] }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/tax-slabs`, {
      cache: "no-store",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch tax slabs:", error);
    return { status: false, data: [] };
  }
}

export async function createTaxSlab(formData: FormData): Promise<{ status: boolean; message: string; data?: TaxSlab }> {
  const name = formData.get("name") as string;
  const minAmount = parseFloat(formData.get("minAmount") as string);
  const maxAmount = parseFloat(formData.get("maxAmount") as string);
  const rate = parseFloat(formData.get("rate") as string);

  if (!name?.trim() || isNaN(minAmount) || isNaN(maxAmount) || isNaN(rate)) {
    return { status: false, message: "All fields are required" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/tax-slabs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name, minAmount, maxAmount, rate }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/tax-slabs");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create tax slab" };
  }
}

export async function createTaxSlabs(
  items: { name: string; minAmount: number; maxAmount: number; rate: number }[]
): Promise<{ status: boolean; message: string }> {
  if (!items.length) return { status: false, message: "At least one tax slab is required" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/tax-slabs/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/tax-slabs");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create tax slabs" };
  }
}

export async function updateTaxSlab(id: string, formData: FormData): Promise<{ status: boolean; message: string; data?: TaxSlab }> {
  const name = formData.get("name") as string;
  const minAmount = parseFloat(formData.get("minAmount") as string);
  const maxAmount = parseFloat(formData.get("maxAmount") as string);
  const rate = parseFloat(formData.get("rate") as string);

  if (!name?.trim()) return { status: false, message: "Name is required" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/tax-slabs/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name, minAmount, maxAmount, rate }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/tax-slabs");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update tax slab" };
  }
}

export async function deleteTaxSlab(id: string): Promise<{ status: boolean; message: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/tax-slabs/${id}`, {
      method: "DELETE",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/tax-slabs");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete tax slab" };
  }
}

export async function deleteTaxSlabs(ids: string[]): Promise<{ status: boolean; message: string }> {
  if (!ids.length) return { status: false, message: "No items to delete" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/tax-slabs/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/tax-slabs");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete tax slabs" };
  }
}

export async function updateTaxSlabs(
  items: { id: string; name: string; minAmount: number; maxAmount: number; rate: number }[]
): Promise<{ status: boolean; message: string }> {
  if (!items.length) return { status: false, message: "No items to update" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/tax-slabs/bulk`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/tax-slabs");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update tax slabs" };
  }
}

