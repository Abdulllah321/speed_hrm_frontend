'use server';

import { getAccessToken } from '../auth';
import { revalidatePath } from "next/cache";

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

async function getAuthHeaders(isJson = true) {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
        ...(token && { Authorization: `Bearer ${token}` }),
    };

    if (isJson) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
}

export interface Location {
    id: string;
    name: string;
    address: string | null;
    cityId: string | null;
    city?: {
        id: string;
        name: string;
        country?: { id: string; name: string };
    } | null;
    status: 'active' | 'inactive';
    createdAt: string;
    updatedAt: string;
}

// Get all locations
export async function getLocations(): Promise<{ status: boolean; data?: Location[]; message?: string }> {
    try {
        const res = await fetch(`${API_URL}/locations`, {
            headers: await getAuthHeaders(false),
            cache: 'no-store',
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Failed to fetch locations' }));
            return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching locations:', error);
        return {
            status: false,
            message: error instanceof Error ? error.message : 'Failed to fetch locations. Please check your connection.'
        };
    }
}

// Get location by id
export async function getLocationById(id: string): Promise<{ status: boolean; data?: Location; message?: string }> {
    try {
        const res = await fetch(`${API_URL}/locations/${id}`, {
            headers: await getAuthHeaders(false),
            cache: 'no-store',
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Failed to fetch location' }));
            return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching location:', error);
        return {
            status: false,
            message: error instanceof Error ? error.message : 'Failed to fetch location'
        };
    }
}

// Create locations bulk (Updated to match Department pattern + address/city)
export async function createLocations(items: { name: string; address?: string; cityId?: string }[]): Promise<{ status: boolean; message: string; data?: Location[] }> {
    if (!items.length) {
        return { status: false, message: "At least one location is required" };
    }

    try {
        const res = await fetch(`${API_URL}/locations/bulk`, {
            method: "POST",
            headers: await getAuthHeaders(),
            body: JSON.stringify({ items }),
        });
        const data = await res.json();

        if (data.status) {
            revalidatePath("/dashboard/master/location");
        }

        return data;
    } catch (error) {
        return { status: false, message: "Failed to create locations" };
    }
}

// Update locations bulk
export async function updateLocations(
    items: { id: string; name: string; address?: string; cityId?: string }[]
): Promise<{ status: boolean; message: string }> {
    if (!items.length) {
        return { status: false, message: "No items to update" };
    }

    try {
        const res = await fetch(`${API_URL}/locations/bulk`, {
            method: "PUT",
            headers: await getAuthHeaders(),
            body: JSON.stringify({ items }),
        });
        const data = await res.json();

        if (data.status) {
            revalidatePath("/dashboard/master/location");
        }

        return data;
    } catch (error) {
        return { status: false, message: "Failed to update locations" };
    }
}

// Delete locations bulk
export async function deleteLocations(ids: string[]): Promise<{ status: boolean; message: string }> {
    if (!ids.length) {
        return { status: false, message: "No items to delete" };
    }

    try {
        const res = await fetch(`${API_URL}/locations/bulk`, {
            method: "DELETE",
            headers: await getAuthHeaders(),
            body: JSON.stringify({ ids }),
        });
        const data = await res.json();

        if (data.status) {
            revalidatePath("/dashboard/master/location");
        }

        return data;
    } catch (error) {
        return { status: false, message: "Failed to delete locations" };
    }
}

// Legacy single actions for compatibility if needed
export async function deleteLocation(id: string): Promise<{ status: boolean; message?: string }> {
    try {
        const res = await fetch(`${API_URL}/locations/${id}`, {
            method: 'DELETE',
            headers: await getAuthHeaders(false),
        });
        const data = await res.json();
        if (data.status) revalidatePath("/dashboard/master/location");
        return data;
    } catch (error) {
        return { status: false, message: 'Failed to delete location' };
    }
}
