"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export interface LoanType {
  id: string;
  name: string;
  status: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getLoanTypes(): Promise<{ status: boolean; data: LoanType[]; message?: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/loan-types`, {
      cache: "no-store",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch loan types:", error);
    return { status: false, data: [], message: "Failed to fetch loan types" };
  }
}

export async function createLoanType(formData: FormData): Promise<{ status: boolean; message: string; data?: LoanType }> {
  const name = formData.get("name") as string;
  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/loan-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/master/loan-types");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create loan type" };
  }
}

export async function createLoanTypes(
  items: { name: string }[]
): Promise<{ status: boolean; message: string }> {
  if (!items.length) return { status: false, message: "At least one loan type is required" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/loan-types/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/master/loan-types");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create loan types" };
  }
}

export async function updateLoanType(id: string, formData: FormData): Promise<{ status: boolean; message: string; data?: LoanType }> {
  const name = formData.get("name") as string;
  if (!name?.trim()) return { status: false, message: "Name is required" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/loan-types/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/master/loan-types");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update loan type" };
  }
}

export async function deleteLoanType(id: string): Promise<{ status: boolean; message: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/loan-types/${id}`, {
      method: "DELETE",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    const data = await res.json();
    if (data.status) revalidatePath("/master/loan-types");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete loan type" };
  }
}

export async function deleteLoanTypes(ids: string[]): Promise<{ status: boolean; message: string }> {
  if (!ids.length) return { status: false, message: "No items to delete" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/loan-types/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/master/loan-types");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete loan types" };
  }
}

export async function updateLoanTypes(
  items: { id: string; name: string }[]
): Promise<{ status: boolean; message: string }> {
  if (!items.length) return { status: false, message: "No items to update" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/loan-types/bulk`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/master/loan-types");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update loan types" };
  }
}

