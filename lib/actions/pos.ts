"use server"
import { authFetch } from '@/lib/auth';
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { getCookieDomain } from "@/lib/utils";

export interface Pos {
    id: string;
    posId: string;
    name: string;
    locationId: string;
    companyId: string | null;
    status: 'active' | 'inactive';
    terminalPin?: string;
    terminalCode: string;
    createdAt: string;
    updatedAt: string;
}

// Get POS by location
export async function getPosByLocation(locationId: string): Promise<{ status: boolean; data?: Pos[]; message?: string }> {
    try {
        const res = await authFetch(`/pos/location/${locationId}`, {});
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Failed to fetch POS terminals' }));
            return { status: false, message: errorData.message || `HTTP error! status: ${res.status}` };
        }
        return res.json();
    } catch (error) {
        console.error('Error fetching POS terminals:', error);
        return {
            status: false,
            message: 'Failed to fetch POS terminals'
        };
    }
}

// Create POS
export async function createPos(data: {
    name: string;
    locationId: string;
    companyId?: string;
    terminalPin?: string;
    status?: string;
    terminalCode?: string;
}): Promise<{ status: boolean; message: string; data?: Pos }> {
    try {
        const res = await authFetch(`/pos`, {
            method: "POST",
            body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.status) {
            revalidatePath(`/master/location/pos/${data.locationId}`);
        }
        return result;
    } catch (error) {
        return { status: false, message: "Failed to create POS" };
    }
}

// Update POS
export async function updatePos(
    id: string,
    data: {
        name?: string;
        companyId?: string;
        terminalPin?: string;
        status?: string,
    }): Promise<{ status: boolean; message: string }> {
    try {
        const res = await authFetch(`/pos/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.status) {
            revalidatePath("/master/location/list");
        }
        return result;
    } catch (error) {
        return { status: false, message: "Failed to update POS" };
    }
}

// Delete POS
export async function deletePos(id: string, locationId: string): Promise<{ status: boolean; message: string }> {
    try {
        const res = await authFetch(`/pos/${id}`, {
            method: "DELETE",
        });
        const result = await res.json();
        if (result.status) {
            revalidatePath(`/master/location/pos/${locationId}`);
        }
        return result;
    } catch (error) {
        return { status: false, message: "Failed to delete POS" };
    }
}

/**
 * Set the POS terminal details in cookies
 */
export async function setPosTerminalAction(terminalCode: string, terminalName: string): Promise<void> {
    const cookieStore = await cookies();
    const headersList = await headers();
    const host = headersList.get("host") || "";
    const domain = getCookieDomain(host);
    const cookieOptions = {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
        domain: domain,
    };

    cookieStore.set("pos_terminal_code", terminalCode, cookieOptions);
    cookieStore.set("pos_terminal_name", terminalName, cookieOptions);
}

/**
 * Get the POS terminal details from cookies
 */
export async function getPosTerminalAction(): Promise<{ code: string | null; name: string | null }> {
    const cookieStore = await cookies();
    return {
        code: cookieStore.get("pos_terminal_code")?.value || null,
        name: cookieStore.get("pos_terminal_name")?.value || null,
    };
}

/**
 * Clear the POS terminal details from cookies
 */
export async function clearPosTerminalAction(): Promise<void> {
    const cookieStore = await cookies();
    const headersList = await headers();
    const host = headersList.get("host") || "";
    const domain = getCookieDomain(host);
    const cookieOptions = {
        path: "/",
        domain: domain,
    };

    cookieStore.delete({ name: "pos_terminal_code", ...cookieOptions });
    cookieStore.delete({ name: "pos_terminal_name", ...cookieOptions });
}
