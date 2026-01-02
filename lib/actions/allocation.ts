"use server";

import { revalidatePath } from "next/cache";
import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export interface Allocation {
    id: string;
    name: string;
    status: string;
    createdById?: string;
    createdBy?: {
        firstName: string;
        lastName: string;
    };
    createdAt: string;
    updatedAt: string;
}

export async function getAllocations(): Promise<{ status: boolean; data: Allocation[]; message?: string }> {
    try {
        const token = await getAccessToken();
        const res = await fetch(`${API_BASE}/allocations`, {
            cache: "no-store",
            headers: { ...(token && { Authorization: `Bearer ${token}` }) },
        });
        return res.json();
    } catch (error) {
        console.error("Failed to fetch allocations:", error);
        return { status: false, data: [], message: "Failed to fetch allocations" };
    }
}

export async function getAllocationById(id: string): Promise<{ status: boolean; data: Allocation | null }> {
    try {
        const token = await getAccessToken();
        const res = await fetch(`${API_BASE}/allocations/${id}`, {
            cache: "no-store",
            headers: { ...(token && { Authorization: `Bearer ${token}` }) },
        });
        return res.json();
    } catch (error) {
        console.error("Failed to fetch allocation:", error);
        return { status: false, data: null };
    }
}

export async function createAllocations(names: string[]): Promise<{ status: boolean; message: string; data?: any }> {
    if (!names.length) {
        return { status: false, message: "At least one name is required" };
    }

    try {
        const token = await getAccessToken();
        const res = await fetch(`${API_BASE}/allocations/bulk`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({ names }),
        });
        const data = await res.json();

        if (data.status) {
            revalidatePath("/dashboard/master/allocation");
        }

        return data;
    } catch (error) {
        return { status: false, message: "Failed to create allocations" };
    }
}

export async function updateAllocation(id: string, formData: FormData): Promise<{ status: boolean; message: string; data?: Allocation }> {
    const name = formData.get("name") as string;

    if (!name?.trim()) {
        return { status: false, message: "Name is required" };
    }

    try {
        const token = await getAccessToken();
        const res = await fetch(`${API_BASE}/allocations/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({ name }),
        });
        const data = await res.json();

        if (data.status) {
            revalidatePath("/dashboard/master/allocation");
        }

        return data;
    } catch (error) {
        return { status: false, message: "Failed to update allocation" };
    }
}

export async function deleteAllocation(id: string): Promise<{ status: boolean; message: string }> {
    try {
        const token = await getAccessToken();
        const res = await fetch(`${API_BASE}/allocations/${id}`, {
            method: "DELETE",
            headers: {
                ...(token && { Authorization: `Bearer ${token}` }),
            },
        });
        const data = await res.json();

        if (data.status) {
            revalidatePath("/dashboard/master/allocation");
        }

        return data;
    } catch (error) {
        return { status: false, message: "Failed to delete allocation" };
    }
}

export async function deleteAllocations(ids: string[]): Promise<{ status: boolean; message: string }> {
    if (!ids.length) {
        return { status: false, message: "No items to delete" };
    }

    try {
        const token = await getAccessToken();
        const res = await fetch(`${API_BASE}/allocations/bulk`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({ ids }),
        });
        const data = await res.json();

        if (data.status) {
            revalidatePath("/dashboard/master/allocation");
        }

        return data;
    } catch (error) {
        return { status: false, message: "Failed to delete allocations" };
    }
}

export async function updateAllocations(
    items: { id: string; name: string }[]
): Promise<{ status: boolean; message: string }> {
    if (!items.length) {
        return { status: false, message: "No items to update" };
    }

    try {
        const token = await getAccessToken();
        const res = await fetch(`${API_BASE}/allocations/bulk`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({ items }),
        });
        const data = await res.json();

        if (data.status) {
            revalidatePath("/dashboard/master/allocation");
        }

        return data;
    } catch (error) {
        return { status: false, message: "Failed to update allocations" };
    }
}
