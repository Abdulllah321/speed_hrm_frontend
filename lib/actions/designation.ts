"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export interface Designation {
  id: string;
  name: string;
  status: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Designation Actions
export async function getDesignations(): Promise<{ status: boolean; data: Designation[]; message?: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/designations`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      }
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch designations:", error);
    return { status: false, data: [], message: "Failed to fetch designations" };
  }
}

export async function getDesignationById(id: string): Promise<{ status: boolean; data: Designation | null }> {
  try {
    const res = await fetch(`${API_BASE}/designations/${id}`, {
      cache: "no-store",
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch designation:", error);
    return { status: false, data: null };
  }
}

export async function createDesignation(formData: FormData): Promise<{ status: boolean; message: string; data?: Designation }> {
  const name = formData.get("name") as string;
  
  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/designations`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    
    if (data.status) {
      revalidatePath("/dashboard/master/designation");
    }
    
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create designation" };
  }
}

export async function createDesignations(names: string[]): Promise<{ status: boolean; message: string; data?: Designation[] }> {
  if (!names.length) {
    return { status: false, message: "At least one name is required" };
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/designations/bulk`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ names }),
    });
    const data = await res.json();
    
    if (data.status) {
      revalidatePath("/dashboard/master/designation");
    }
    
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create designations" };
  }
}

export async function updateDesignation(id: string, formData: FormData): Promise<{ status: boolean; message: string; data?: Designation }> {
  const name = formData.get("name") as string;
  
  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/designations/${id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    
    if (data.status) {
      revalidatePath("/dashboard/master/designation");
    }
    
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update designation" };
  }
}

export async function deleteDesignation(id: string): Promise<{ status: boolean; message: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/designations/${id}`, {
      method: "DELETE",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    const data = await res.json();
    
    if (data.status) {
      revalidatePath("/dashboard/master/designation");
    }
    
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete designation" };
  }
}

export async function deleteDesignations(ids: string[]): Promise<{ status: boolean; message: string }> {
  if (!ids.length) {
    return { status: false, message: "No items to delete" };
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/designations/bulk`, {
      method: "DELETE",
      headers: { 
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();

    if (data.status) {
      revalidatePath("/dashboard/master/designation");
    }

    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete designations" };
  }
}

export async function updateDesignations(
  items: { id: string; name: string }[]
): Promise<{ status: boolean; message: string }> {
  if (!items.length) {
    return { status: false, message: "No items to update" };
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/designations/bulk`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();

    if (data.status) {
      revalidatePath("/dashboard/master/designation");
    }

    return data;
  } catch (error) {
    return { status: false, message: "Failed to update designations" };
  }
}

