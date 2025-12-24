"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export interface RebateNature {
  id: string;
  name: string;
  maxInvestmentPercentage?: number | null;
  maxInvestmentAmount?: number | null;
  details?: string | null;
  underSection?: string | null;
  isAgeDependent: boolean;
  status: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export async function getRebateNatures(): Promise<{ status: boolean; data: RebateNature[]; message?: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/rebate-nature`, {
      cache: "no-store",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    const data = await res.json();
    return { status: true, data: Array.isArray(data) ? data : [] }; // Controller returns array directly, wrap it
  } catch (error) {
    console.error("Failed to fetch rebate natures:", error);
    return { status: false, data: [], message: "Failed to fetch rebate natures" };
  }
}

export async function createRebateNature(data: Partial<RebateNature>): Promise<{ status: boolean; message: string; data?: RebateNature }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/rebate-nature`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create");
    }

    const result = await res.json();

    revalidatePath("/dashboard/master/rebate-nature");
    return { status: true, message: "Rebate Nature created successfully", data: result };
  } catch (error: any) {
    return { status: false, message: error.message || "Failed to create rebate nature" };
  }
}

export async function updateRebateNature(id: string, data: Partial<RebateNature>): Promise<{ status: boolean; message: string; data?: RebateNature }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/rebate-nature/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update");
    }

    const result = await res.json();

    revalidatePath("/dashboard/master/rebate-nature");
    return { status: true, message: "Rebate Nature updated successfully", data: result };
  } catch (error: any) {
    return { status: false, message: error.message || "Failed to update rebate nature" };
  }
}

export async function deleteRebateNature(id: string): Promise<{ status: boolean; message: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/rebate-nature/${id}`, {
      method: "DELETE",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!res.ok) {
         const error = await res.json();
        throw new Error(error.message || "Failed to delete");
    }

    revalidatePath("/dashboard/master/rebate-nature");
    return { status: true, message: "Rebate Nature deleted successfully" };
  } catch (error: any) {
    return { status: false, message: error.message || "Failed to delete rebate nature" };
  }
}
