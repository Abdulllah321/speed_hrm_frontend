"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export interface Department {
  id: string;
  name: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  subDepartments?: SubDepartment[];
}

export interface SubDepartment {
  id: string;
  name: string;
  departmentId: string;
  department?: Department;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Department Actions
export async function getDepartments(): Promise<{ status: boolean; data: Department[] }> {
  try {
    const res = await fetch(`${API_BASE}/departments`, {
      cache: "no-store",
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch departments:", error);
    return { status: false, data: [] };
  }
}

export async function getDepartmentById(id: string): Promise<{ status: boolean; data: Department | null }> {
  try {
    const res = await fetch(`${API_BASE}/departments/${id}`, {
      cache: "no-store",
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch department:", error);
    return { status: false, data: null };
  }
}

export async function createDepartment(formData: FormData): Promise<{ status: boolean; message: string; data?: Department }> {
  const name = formData.get("name") as string;
  
  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/departments`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    
    if (data.status) {
      revalidatePath("/dashboard/master/department");
    }
    
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create department" };
  }
}

export async function createDepartments(names: string[]): Promise<{ status: boolean; message: string; data?: Department[] }> {
  if (!names.length) {
    return { status: false, message: "At least one name is required" };
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/departments/bulk`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ names }),
    });
    const data = await res.json();
    
    if (data.status) {
      revalidatePath("/dashboard/master/department");
    }
    
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create departments" };
  }
}

export async function updateDepartment(id: string, formData: FormData): Promise<{ status: boolean; message: string; data?: Department }> {
  const name = formData.get("name") as string;
  
  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/departments/${id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    
    if (data.status) {
      revalidatePath("/dashboard/master/department");
    }
    
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update department" };
  }
}

export async function deleteDepartment(id: string): Promise<{ status: boolean; message: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/departments/${id}`, {
      method: "DELETE",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    const data = await res.json();
    
    if (data.status) {
      revalidatePath("/dashboard/master/department");
    }
    
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete department" };
  }
}

export async function deleteDepartments(ids: string[]): Promise<{ status: boolean; message: string }> {
  if (!ids.length) {
    return { status: false, message: "No items to delete" };
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/departments/bulk`, {
      method: "DELETE",
      headers: { 
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();

    if (data.status) {
      revalidatePath("/dashboard/master/department");
    }

    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete departments" };
  }
}

export async function updateDepartments(
  items: { id: string; name: string }[]
): Promise<{ status: boolean; message: string }> {
  if (!items.length) {
    return { status: false, message: "No items to update" };
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/departments/bulk`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();

    if (data.status) {
      revalidatePath("/dashboard/master/department");
    }

    return data;
  } catch (error) {
    return { status: false, message: "Failed to update departments" };
  }
}

// Sub-Department Actions
export async function getSubDepartments(): Promise<{ status: boolean; data: SubDepartment[] }> {
  try {
    const res = await fetch(`${API_BASE}/sub-departments`, {
      cache: "no-store",
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch sub-departments:", error);
    return { status: false, data: [] };
  }
}

export async function getSubDepartmentsByDepartment(departmentId: string): Promise<{ status: boolean; data: SubDepartment[] }> {
  try {
    const res = await fetch(`${API_BASE}/sub-departments/department/${departmentId}`, {
      cache: "no-store",
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch sub-departments:", error);
    return { status: false, data: [] };
  }
}

export async function createSubDepartment(formData: FormData): Promise<{ status: boolean; message: string; data?: SubDepartment }> {
  const name = formData.get("name") as string;
  const departmentId = formData.get("departmentId") as string;
  
  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }
  if (!departmentId) {
    return { status: false, message: "Department is required" };
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/sub-departments`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name, departmentId }),
    });
    const data = await res.json();
    
    if (data.status) {
      revalidatePath("/dashboard/master/sub-department");
    }
    
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create sub-department" };
  }
}

export async function createSubDepartments(
  items: { name: string; departmentId: string }[]
): Promise<{ status: boolean; message: string; data?: SubDepartment[] }> {
  if (!items.length) {
    return { status: false, message: "At least one sub-department is required" };
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/sub-departments/bulk`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();

    if (data.status) {
      revalidatePath("/dashboard/master/sub-department");
    }

    return data;
  } catch (error) {
    return { status: false, message: "Failed to create sub-departments" };
  }
}

export async function updateSubDepartment(id: string, formData: FormData): Promise<{ status: boolean; message: string; data?: SubDepartment }> {
  const name = formData.get("name") as string;
  const departmentId = formData.get("departmentId") as string;
  
  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/sub-departments/${id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name, departmentId: departmentId || undefined }),
    });
    const data = await res.json();
    
    if (data.status) {
      revalidatePath("/dashboard/master/sub-department");
    }
    
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update sub-department" };
  }
}

export async function deleteSubDepartment(id: string): Promise<{ status: boolean; message: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/sub-departments/${id}`, {
      method: "DELETE",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    const data = await res.json();
    
    if (data.status) {
      revalidatePath("/dashboard/master/sub-department");
    }
    
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete sub-department" };
  }
}

export async function deleteSubDepartments(ids: string[]): Promise<{ status: boolean; message: string }> {
  if (!ids.length) {
    return { status: false, message: "No items to delete" };
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/sub-departments/bulk`, {
      method: "DELETE",
      headers: { 
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();

    if (data.status) {
      revalidatePath("/dashboard/master/sub-department");
    }

    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete sub-departments" };
  }
}

export async function updateSubDepartments(
  items: { id: string; name: string; departmentId: string }[]
): Promise<{ status: boolean; message: string }> {
  if (!items.length) {
    return { status: false, message: "No items to update" };
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/sub-departments/bulk`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();

    if (data.status) {
      revalidatePath("/dashboard/master/sub-department");
    }

    return data;
  } catch (error) {
    return { status: false, message: "Failed to update sub-departments" };
  }
}
