"use server";

import { authFetch } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createStockRequisition(data: any) {
    try {
        const response = await authFetch("/stock-requisition", {
            method: "POST",
            body: JSON.stringify(data),
        });
        revalidatePath("/erp/inventory/transactions/stock-requisition");
        return response.data ?? { status: false, message: "Failed to create stock requisition" };
    } catch (error) {
        console.error("Create stock requisition error:", error);
        throw error;
    }
}
