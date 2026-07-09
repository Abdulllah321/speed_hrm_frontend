"use server";
import { authFetch } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface Payee {
  id: string;
  name: string;
  code: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function getPayees(type: 'director' | 'salary' | 'tax'): Promise<{ status: boolean; data: Payee[]; message?: string }> {
  try {
    const res = await authFetch(`/payees/${type}`, {});
    if (res.ok) {
      return { status: true, data: res.data };
    }
    return { status: false, data: [], message: `Failed to fetch ${type}s` };
  } catch (error) {
    console.error(`Failed to fetch ${type}s:`, error);
    return { status: false, data: [], message: `Failed to fetch ${type}s` };
  }
}

export async function createPayee(type: 'director' | 'salary' | 'tax', data: { name: string; code: string }): Promise<{ status: boolean; data?: Payee; message?: string }> {
  try {
    const res = await authFetch(`/payees/${type}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (res.ok || res.data?.id) {
      return { status: true, data: res.data, message: `${type} created successfully` };
    }
    return { status: false, message: res.data?.message || `Failed to create ${type}` };
  } catch (error) {
    console.error(`Failed to create ${type}:`, error);
    return { status: false, message: `Failed to create ${type}` };
  }
}

export async function updatePayee(
  type: 'director' | 'salary' | 'tax', 
  id: string, 
  data: { name: string; code: string }
): Promise<{ status: boolean; data?: Payee; message?: string }> {
  try {
    const res = await authFetch(`/payees/${type}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    
    if (res.ok) {
      return { status: true, data: res.data, message: `${type} updated successfully` };
    }
    return { status: false, message: res.data?.message || `Failed to update ${type}` };
  } catch (error) {
    console.error(`Failed to update ${type}:`, error);
    return { status: false, message: `Failed to update ${type}` };
  }
}

export async function deletePayee(
  type: 'director' | 'salary' | 'tax', 
  id: string
): Promise<{ status: boolean; message?: string }> {
  try {
    const res = await authFetch(`/payees/${type}/${id}`, {
      method: 'DELETE',
    });
    
    if (res.ok) {
      return { status: true, message: `${type} deleted successfully` };
    }
    return { status: false, message: res.data?.message || `Failed to delete ${type}` };
  } catch (error) {
    console.error(`Failed to delete ${type}:`, error);
    return { status: false, message: `Failed to delete ${type}` };
  }
}
