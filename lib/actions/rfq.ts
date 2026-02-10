"use server";

import { authFetch } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getRfqs(status?: string) {
    try {
        const response = await authFetch(`/rfq${status ? `?status=${status}` : ""}`);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Get RFQs error:", error);
        return { status: false, message: "Failed to fetch RFQs", data: [] };
    }
}

export async function getRfq(id: string) {
    try {
        const response = await authFetch(`/rfq/${id}`);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Get RFQ error:", error);
        return { status: false, message: "Failed to fetch RFQ", data: null };
    }
}

export async function createRfq(data: any) {
    try {
        const response = await authFetch("/rfq", {
            method: "POST",
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (result.status) {
            revalidatePath("/erp/procurement/rfq");
        }
        return result;
    } catch (error) {
        console.error("Create RFQ error:", error);
        return { status: false, message: "Failed to create RFQ" };
    }
}

export async function markRfqAsSent(id: string) {
    try {
        const response = await authFetch(`/rfq/${id}/send`, {
            method: "POST",
        });
        const result = await response.json();
        if (result.status) {
            revalidatePath("/erp/procurement/rfq");
            revalidatePath(`/erp/procurement/rfq/${id}`);
        }
        return result;
    } catch (error) {
        console.error("Mark RFQ as sent error:", error);
        return { status: false, message: "Failed to mark RFQ as sent" };
    }
}
