"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export interface JobType {
  id: string;
  name: string;
  status: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getJobTypes(): Promise<{ status: boolean; data: JobType[]; message?: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/job-types`, {
      cache: "no-store",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch job types:", error);
    return { status: false, data: [], message: "Failed to fetch job types" };
  }
}

export async function getJobTypeById(id: string): Promise<{ status: boolean; data: JobType | null }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/job-types/${id}`, {
      cache: "no-store",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    return res.json();
  } catch (error) {
    console.error("Failed to fetch job type:", error);
    return { status: false, data: null };
  }
}

export async function createJobType(formData: FormData): Promise<{ status: boolean; message: string; data?: JobType }> {
  const name = formData.get("name") as string;
  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/job-types`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.status) {
      revalidatePath("/master/job-type");
    }
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create job type" };
  }
}

export async function createJobTypes(names: string[]): Promise<{ status: boolean; message: string }> {
  if (!names.length) {
    return { status: false, message: "At least one name is required" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/job-types/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ names }),
    });
    const data = await res.json();
    if (data.status) {
      revalidatePath("/master/job-type");
    }
    return data;
  } catch (error) {
    return { status: false, message: "Failed to create job types" };
  }
}

export async function updateJobType(id: string, formData: FormData): Promise<{ status: boolean; message: string; data?: JobType }> {
  const name = formData.get("name") as string;
  if (!name?.trim()) {
    return { status: false, message: "Name is required" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/job-types/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ id, name }),
    });
    const data = await res.json();
    if (data.status) {
      revalidatePath("/master/job-type");
    }
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update job type" };
  }
}

export async function deleteJobType(id: string): Promise<{ status: boolean; message: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/job-types/${id}`, {
      method: "DELETE",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    const data = await res.json();
    if (data.status) {
      revalidatePath("/master/job-type");
    }
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete job type" };
  }
}

export async function deleteJobTypes(ids: string[]): Promise<{ status: boolean; message: string }> {
  if (!ids.length) {
    return { status: false, message: "No items to delete" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/job-types/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (data.status) {
      revalidatePath("/master/job-type");
    }
    return data;
  } catch (error) {
    return { status: false, message: "Failed to delete job types" };
  }
}

export async function updateJobTypes(items: { id: string; name: string }[]): Promise<{ status: boolean; message: string }> {
  if (!items.length) {
    return { status: false, message: "No items to update" };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/job-types/bulk`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.status) {
      revalidatePath("/master/job-type");
    }
    return data;
  } catch (error) {
    return { status: false, message: "Failed to update job types" };
  }
}

