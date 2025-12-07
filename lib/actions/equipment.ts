"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export interface Equipment {
  id: string;
  name: string;
  status: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getEquipments(): Promise<{ status: boolean; data: Equipment[]; message?: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/equipments`, {
      cache: "no-store",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch equipments:", error);
    return { status: false, data: [], message: "Failed to fetch equipments" };
  }
}

export async function createEquipment(formData: FormData): Promise<{ status: boolean; message: string; data?: Equipment }> {
  const name = formData.get("name") as string;
  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/equipments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/equipment");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create equipment" };
  }
}

export async function createEquipments(
  items: { name: string }[]
): Promise<{ status: boolean; message: string }> {
  if (!items.length) return { status: false, message: "At least one equipment is required" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/equipments/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/equipment");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create equipments" };
  }
}

export async function updateEquipment(id: string, formData: FormData): Promise<{ status: boolean; message: string; data?: Equipment }> {
  const name = formData.get("name") as string;
  if (!name?.trim()) return { status: false, message: "Name is required" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/equipments/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/equipment");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update equipment" };
  }
}

export async function deleteEquipment(id: string): Promise<{ status: boolean; message: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/equipments/${id}`, {
      method: "DELETE",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/equipment");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete equipment" };
  }
}

export async function deleteEquipments(ids: string[]): Promise<{ status: boolean; message: string }> {
  if (!ids.length) return { status: false, message: "No items to delete" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/equipments/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/equipment");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete equipments" };
  }
}

export async function updateEquipments(
  items: { id: string; name: string }[]
): Promise<{ status: boolean; message: string }> {
  if (!items.length) return { status: false, message: "No items to update" };
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/equipments/bulk`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/dashboard/master/equipment");
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update equipments" };
  }
}

