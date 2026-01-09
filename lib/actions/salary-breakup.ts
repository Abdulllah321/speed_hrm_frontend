"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_URL = process.env.API_URL || "http://localhost:5000/api";

export interface SalaryBreakup {
  id: string;
  name: string;
  details: string | null;
  percentage: number | string | null;
  status: string;
  createdById?: string | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export async function createSalaryBreakup(
  name: string,
  percentage: number,
  isTaxable: boolean = false
): Promise<{ status: boolean; message: string; data?: SalaryBreakup }> {
  if (!name?.trim()) return { status: false, message: "Name is required" };
  if (percentage === undefined || percentage === null) {
    return { status: false, message: "Percentage is required" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_URL}/salary-breakups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ 
        name, 
        percentage, 
        isTaxable,
        status: "active" 
      }),
    });
    const data = await res.json();
    if (data.status) revalidatePath("/master/salary-breakup/list");
    return data;
  } catch {
    return { status: false, message: "Failed to create salary breakup" };
  }
}

export async function getSalaryBreakups(): Promise<{
  status: boolean;
  message?: string;
  data?: SalaryBreakup[];
}> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_URL}/salary-breakups`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "Failed to fetch salary breakups" }));
      return {
        status: false,
        message: errorData.message || `HTTP error! status: ${res.status}`,
      };
    }

    const result = await res.json();
    return {
      status: result.status || true,
      data: result.data || result,
      message: result.message,
    };
  } catch (error) {
    console.error("Error fetching salary breakups:", error);
    return {
      status: false,
      message: error instanceof Error ? error.message : "Failed to fetch salary breakups",
    };
  }
}

export async function updateSalaryBreakup(
  id: string,
  data: { name: string; percentage: number; isTaxable?: boolean; status?: string }
): Promise<{ status: boolean; message: string; data?: SalaryBreakup }> {
  if (!id?.trim()) return { status: false, message: "ID is required" };
  if (!data.name?.trim()) return { status: false, message: "Name is required" };
  if (data.percentage === undefined || data.percentage === null) {
    return { status: false, message: "Percentage is required" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_URL}/salary-breakups/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.status) revalidatePath("/master/salary-breakup/list");
    return result;
  } catch (error) {
    return { status: false, message: "Failed to update salary breakup" };
  }
}

export async function deleteSalaryBreakup(
  id: string
): Promise<{ status: boolean; message: string }> {
  if (!id?.trim()) return { status: false, message: "ID is required" };
  try {
    const token = await getAccessToken();
    const headers: HeadersInit = {
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    const res = await fetch(`${API_URL}/salary-breakups/${id}`, {
      method: "DELETE",
      headers,
    });
    const result = await res.json();
    if (result.status) revalidatePath("/master/salary-breakup/list");
    return result;
  } catch (error) {
    return { status: false, message: "Failed to delete salary breakup" };
  }
}
