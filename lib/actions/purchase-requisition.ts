"use server";

import { authFetch } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getPurchaseRequisitions(status?: string) {
    try {
        const response = await authFetch(`/purchase-requisition${status ? `?status=${status}` : ""}`);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Get PRs error:", error);
        return [];
    }
}

export async function getPurchaseRequisition(id: string) {
    try {
        const response = await authFetch(`/purchase-requisition/${id}`);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Get PR error:", error);
        return null;
    }
}

export async function createPurchaseRequisition(data: any) {
    try {
        const response = await authFetch("/purchase-requisition", {
            method: "POST",
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (result.status !== false) {
            revalidatePath("/erp/procurement/purchase-requisition");
        }
        return result;
    } catch (error) {
        console.error("Create PR error:", error);
        return { status: false, message: "Failed to create PR" };
    }
}
