"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export interface LeaveType {
  id: string;
  name: string;
  status: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getLeaveTypes(): Promise<{ status: boolean; data: LeaveType[]; message?: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/leave-types`, {
      cache: "no-store",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch leave types:", error);
    return { status: false, data: [], message: "Failed to fetch leave types" };
  }
}

export async function createLeaveType(formData: FormData): Promise<{ status: boolean; message: string; data?: LeaveType }> {
  const name = formData.get("name") as string;
  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/leave-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/master/leave-types");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create leave type" };
  }
}

export async function createLeaveTypes(
  items: { name: string }[]
): Promise<{ status: boolean; message: string }> {
  if (!items.length) return { status: false, message: "At least one leave type is required" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/leave-types/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/master/leave-types");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create leave types" };
  }
}

export async function updateLeaveType(id: string, formData: FormData): Promise<{ status: boolean; message: string; data?: LeaveType }> {
  const name = formData.get("name") as string;
  if (!name?.trim()) return { status: false, message: "Name is required" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/leave-types/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ id, name }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/master/leave-types");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update leave type" };
  }
}

export async function deleteLeaveType(id: string): Promise<{ status: boolean; message: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/leave-types/${id}`, {
      method: "DELETE",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    const data = await res.json();
    if (data.status) revalidatePath("/master/leave-types");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete leave type" };
  }
}

export async function deleteLeaveTypes(ids: string[]): Promise<{ status: boolean; message: string }> {
  if (!ids.length) return { status: false, message: "No items to delete" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/leave-types/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/master/leave-types");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete leave types" };
  }
}

export async function updateLeaveTypes(
  items: { id: string; name: string }[]
): Promise<{ status: boolean; message: string }> {
  if (!items.length) return { status: false, message: "No items to update" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/leave-types/bulk`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/master/leave-types");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update leave types" };
  }
}

