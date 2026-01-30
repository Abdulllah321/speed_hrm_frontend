"use server";
import { authFetch } from "@/lib/auth";
import { revalidatePath } from "next/cache";
export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: string; // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  parentId?: string | null;
  parent?: ChartOfAccount | null;
  children?: ChartOfAccount[];
  isGroup: boolean;
  isActive: boolean;
  description?: string | null;
  balance: number;
  createdAt: string;
  updatedAt: string;
}
export async function getChartOfAccounts(): Promise<{ status: boolean; data: ChartOfAccount[]; message?: string }> {
  try {
    const res = await authFetch(`/finance/chart-of-accounts`, {
    });
    // Assuming backend returns standard format. If it returns array directly, wrap it.
    // Based on Controller implementation: return this.chartOfAccountService.findAll();
    // The service returns the array directly. 
    // Wait, the backend controller returns the result of service.findAll() which is Promise<ChartOfAccount[]>.
    // However, the frontend expects { status: boolean; data: any; message?: string }.
    // I should probably check how the backend response interceptor works or wrap the response in the backend.
    // But looking at department.ts, it expects `res.json()` to return `{ status: boolean; data: Department[] }`.
    // Let me check `d:\projects\speed-limit\nestjs_backend\src\main.ts` or interceptors to see if there is global response transformation.
    // For now, I will assume the backend returns the array directly and I might need to adjust the frontend or backend.
    // Actually, usually in this project (based on previous interactions if any, or standard practices in this repo if I could see them), 
    // let's check if there is a global interceptor.
    const data = await res.json();
    if (Array.isArray(data)) {
         return { status: true, data };
    }
    return data;
  } catch (error) {
    console.error("Failed to fetch chart of accounts:", error);
    return { status: false, data: [], message: "Failed to fetch chart of accounts" };
  }
}
export async function getChartOfAccountsTree(): Promise<{ status: boolean; data: ChartOfAccount[]; message?: string }> {
    try {
      const res = await authFetch(`/finance/chart-of-accounts/tree`, {
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        return { status: true, data };
      }
      return data;
    } catch (error) {
      console.error("Failed to fetch chart of accounts tree:", error);
      return { status: false, data: [], message: "Failed to fetch chart of accounts tree" };
    }
  }
export async function createChartOfAccount(data: any): Promise<{ status: boolean; message: string; data?: ChartOfAccount }> {
  try {
    const res = await authFetch(`/finance/chart-of-accounts`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    const result = await res.json();
    // If backend returns the object directly
    if (result.id) {
        revalidatePath("/finance/chart-of-accounts");
        return { status: true, message: "Account created successfully", data: result };
    }
    if (result.status) {
      revalidatePath("/finance/chart-of-accounts");
    }
    return result;
  } catch (error) {
    return { status: false, message: "Failed to create chart of account" };
  }
}
export async function updateChartOfAccount(id: string, data: any): Promise<{ status: boolean; message: string; data?: ChartOfAccount }> {
    try {
      const res = await authFetch(`/finance/chart-of-accounts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.id) {
          revalidatePath("/finance/chart-of-accounts");
          return { status: true, message: "Account updated successfully", data: result };
      }
      if (result.status) {
        revalidatePath("/finance/chart-of-accounts");
      }
      return result;
    } catch (error) {
      return { status: false, message: "Failed to update chart of account" };
    }
  }
export async function deleteChartOfAccount(id: string): Promise<{ status: boolean; message: string }> {
  try {
    const res = await authFetch(`/finance/chart-of-accounts/${id}`, {
      method: "DELETE",
    });
    // Check for 204 or 200
    if (res.ok) {
         revalidatePath("/finance/chart-of-accounts");
         return { status: true, message: "Account deleted successfully" };
    }
    const result = await res.json();
    return result;
  } catch (error) {
    return { status: false, message: "Failed to delete chart of account" };
  }
}
