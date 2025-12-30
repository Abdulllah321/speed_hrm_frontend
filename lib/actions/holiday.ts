"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export interface Holiday {
  id: string;
  name: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getHolidays(): Promise<{ status: boolean; data: Holiday[]; message?: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/holidays`, {
      cache: "no-store",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch holidays:", error);
    return { status: false, data: [], message: "Failed to fetch holidays" };
  }
}

export async function getHolidayById(id: string): Promise<{ status: boolean; data: Holiday | null; message?: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/holidays/${id}`, {
      cache: "no-store",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch holiday:", error);
    return { status: false, data: null, message: "Failed to fetch holiday" };
  }
}

export async function createHoliday(data: { name: string; dateFrom: string; dateTo: string; status?: string }): Promise<{ status: boolean; message: string; data?: Holiday }> {
  if (!data.name?.trim()) {
    return { status: false, message: "Name is required" };
  }
  if (!data.dateFrom || !data.dateTo) {
    return { status: false, message: "Both start date and end date are required" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/holidays`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name: data.name, dateFrom: data.dateFrom, dateTo: data.dateTo, status: data.status || "active" }),
    });
    const result = await res.json();
    if (result.status) {
      revalidatePath("/dashboard/holidays/list");
    }
    return result;
  } catch (error) {
    return { status: false, message: "Failed to create holiday" };
  }
}

export async function updateHoliday(id: string, data: { name?: string; dateFrom?: string; dateTo?: string; status?: string }): Promise<{ status: boolean; message: string; data?: Holiday }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/holidays/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ ...data, id }),
    });
    const result = await res.json();
    if (result.status) {
      revalidatePath("/dashboard/holidays/list");
    }
    return result;
  } catch (error) {
    return { status: false, message: "Failed to update holiday" };
  }
}

export async function deleteHoliday(id: string): Promise<{ status: boolean; message: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/holidays/${id}`, {
      method: "DELETE",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    const data = await res.json();
    if (data.status) {
      revalidatePath("/dashboard/holidays/list");
    }
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete holiday" };
  }
}

export async function deleteHolidays(ids: string[]): Promise<{ status: boolean; message: string }> {
  if (!ids.length) {
    return { status: false, message: "No items to delete" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/holidays/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (data.status) {
      revalidatePath("/dashboard/holidays/list");
    }
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete holidays" };
  }
}

export async function updateHolidays(items: { id: string; name?: string; dateFrom?: string; dateTo?: string; status?: string }[]): Promise<{ status: boolean; message: string }> {
  if (!items.length) {
    return { status: false, message: "No items to update" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/holidays/bulk`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) {
      revalidatePath("/dashboard/holidays/list");
    }
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update holidays" };
  }
}
