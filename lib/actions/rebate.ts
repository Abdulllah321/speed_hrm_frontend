"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

async function getAuthHeaders() {
  const token = await getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export interface Rebate {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    employeeId: string;
    employeeName: string;
    department?: {
      id: string;
      name: string;
    };
    subDepartment?: {
      id: string;
      name: string;
    };
  };
  rebateNatureId: string;
  rebateNature?: {
    id: string;
    name: string;
    type?: string;
    category?: string;
  };
  rebateAmount: number | string;
  monthYear: string; // YYYY-MM format
  attachment?: string | null;
  status: string; // pending, approved, rejected
  remarks?: string | null;
  createdById?: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Get all rebates
export async function getRebates(params?: {
  employeeId?: string;
  rebateNatureId?: string;
  monthYear?: string;
  status?: string;
}): Promise<{ status: boolean; data?: Rebate[]; message?: string }> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.employeeId) queryParams.append("employeeId", params.employeeId);
    if (params?.rebateNatureId) queryParams.append("rebateNatureId", params.rebateNatureId);
    if (params?.monthYear) queryParams.append("monthYear", params.monthYear);
    if (params?.status) queryParams.append("status", params.status);

    const queryString = queryParams.toString();
    const url = `${API_BASE}/rebates${queryString ? `?${queryString}` : ""}`;

    const res = await fetch(url, {
      cache: "no-store",
      headers: await getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "Failed to fetch rebates" }));
      return {
        status: false,
        data: [],
        message: errorData.message || `HTTP error! status: ${res.status}`,
      };
    }

    const result = await res.json();
    return {
      status: true,
      data: Array.isArray(result) ? result : result.data || [],
    };
  } catch (error) {
    console.error("Error fetching rebates:", error);
    return {
      status: false,
      data: [],
      message: error instanceof Error ? error.message : "Failed to fetch rebates. Please check your connection.",
    };
  }
}

// Get rebate by ID
export async function getRebateById(id: string): Promise<{ status: boolean; data?: Rebate; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/rebates/${id}`, {
      cache: "no-store",
      headers: await getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "Failed to fetch rebate" }));
      return {
        status: false,
        message: errorData.message || `HTTP error! status: ${res.status}`,
      };
    }

    const result = await res.json();
    return { status: true, data: result };
  } catch (error) {
    console.error("Error fetching rebate:", error);
    return {
      status: false,
      message: error instanceof Error ? error.message : "Failed to fetch rebate. Please check your connection.",
    };
  }
}

// Create rebate
export async function createRebate(data: {
  employeeId: string;
  rebateNatureId: string;
  rebateAmount: number;
  monthYear: string; // YYYY-MM format
  attachment?: string; // File path/URL
  remarks?: string;
}): Promise<{ status: boolean; data?: Rebate; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/rebates`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        employeeId: data.employeeId,
        rebateNatureId: data.rebateNatureId,
        rebateAmount: data.rebateAmount,
        monthYear: data.monthYear,
        attachment: data.attachment,
        remarks: data.remarks,
      }),
    });

    const result = await res.json();

    if (!res.ok || !result.status) {
      return {
        status: false,
        message: result.message || `HTTP error! status: ${res.status}`,
      };
    }

    revalidatePath("/hr/payroll-setup/rebate");
    return {
      status: true,
      data: result.data,
      message: result.message || "Rebate created successfully",
    };
  } catch (error) {
    console.error("Error creating rebate:", error);
    return {
      status: false,
      message: error instanceof Error ? error.message : "Failed to create rebate",
    };
  }
}

// Update rebate
export async function updateRebate(
  id: string,
  data: {
    employeeId?: string;
    rebateNatureId?: string;
    rebateAmount?: number;
    monthYear?: string;
    attachment?: string | null; // File path/URL
    remarks?: string | null;
    status?: string;
  }
): Promise<{ status: boolean; data?: Rebate; message?: string }> {
  try {
    const jsonData: any = {};
    if (data.employeeId) jsonData.employeeId = data.employeeId;
    if (data.rebateNatureId) jsonData.rebateNatureId = data.rebateNatureId;
    if (data.rebateAmount !== undefined) jsonData.rebateAmount = data.rebateAmount;
    if (data.monthYear) jsonData.monthYear = data.monthYear;
    if (data.remarks !== undefined) jsonData.remarks = data.remarks;
    if (data.status) jsonData.status = data.status;
    if (data.attachment !== undefined) jsonData.attachment = data.attachment;

    const res = await fetch(`${API_BASE}/rebates/${id}`, {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify(jsonData),
    });

    const result = await res.json();

    if (!res.ok || !result.status) {
      return {
        status: false,
        message: result.message || `HTTP error! status: ${res.status}`,
      };
    }

    revalidatePath("/hr/payroll-setup/rebate");
    return {
      status: true,
      data: result.data,
      message: result.message || "Rebate updated successfully",
    };
  } catch (error) {
    console.error("Error updating rebate:", error);
    return {
      status: false,
      message: error instanceof Error ? error.message : "Failed to update rebate",
    };
  }
}

// Delete rebate
export async function deleteRebate(id: string): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/rebates/${id}`, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });

    const result = await res.json();

    if (!res.ok || !result.status) {
      return {
        status: false,
        message: result.message || `HTTP error! status: ${res.status}`,
      };
    }

    revalidatePath("/hr/payroll-setup/rebate");
    return {
      status: true,
      message: result.message || "Rebate deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting rebate:", error);
    return {
      status: false,
      message: error instanceof Error ? error.message : "Failed to delete rebate",
    };
  }
}

