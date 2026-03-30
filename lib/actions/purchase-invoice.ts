"use server";

import { authFetch } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getPurchaseInvoices(params?: {
    page?: number;
    limit?: number;
    supplierId?: string;
    status?: string;
    paymentStatus?: string;
    search?: string;
}) {
    try {
        const query = params ? new URLSearchParams(params as any).toString() : '';
        const response = await authFetch(`/purchase/purchase-invoices?${query}`);
        return response.data ?? { data: [], pagination: null };
    } catch (error) {
        console.error("Get purchase invoices error:", error);
        return { data: [], pagination: null };
    }
}

export async function getPurchaseInvoice(id: string) {
    try {
        const response = await authFetch(`/purchase/purchase-invoices/${id}`);
        return response.data ?? null;
    } catch (error) {
        console.error("Get purchase invoice error:", error);
        return null;
    }
}

export async function createPurchaseInvoice(data: {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate?: string;
    supplierId: string;
    grnId?: string;
    landedCostId?: string;
    discountAmount?: number;
    notes?: string;
    items: {
        itemId: string;
        grnItemId?: string;
        landedCostItemId?: string;
        description: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
        discountRate?: number;
    }[];
}) {
    try {
        const response = await authFetch("/purchase/purchase-invoices", {
            method: "POST",
            body: JSON.stringify(data),
        });
        const result = response.data;
        revalidatePath("/erp/procurement/purchase-invoice");
        return result;
    } catch (error) {
        console.error("Create purchase invoice error:", error);
        throw error;
    }
}

export async function approvePurchaseInvoice(id: string) {
    try {
        const response = await authFetch(`/purchase/purchase-invoices/${id}/approve`, {
            method: "PATCH",
        });
        const result = response.data;
        revalidatePath("/erp/procurement/purchase-invoice");
        revalidatePath(`/erp/procurement/purchase-invoice/${id}`);
        return result;
    } catch (error) {
        console.error("Approve purchase invoice error:", error);
        throw error;
    }
}

export async function cancelPurchaseInvoice(id: string, reason?: string) {
    try {
        const response = await authFetch(`/purchase/purchase-invoices/${id}/cancel`, {
            method: "PATCH",
            body: JSON.stringify({ reason }),
        });
        const result = response.data;
        revalidatePath("/erp/procurement/purchase-invoice");
        revalidatePath(`/erp/procurement/purchase-invoice/${id}`);
        return result;
    } catch (error) {
        console.error("Cancel purchase invoice error:", error);
        throw error;
    }
}

export async function getNextInvoiceNumber() {
    try {
        const response = await authFetch("/purchase/purchase-invoices/next-invoice-number");
        return response.data ?? null;
    } catch (error) {
        console.error("Get next invoice number error:", error);
        return null;
    }
}

export async function getValuedGrns() {
    try {
        const response = await authFetch("/purchase/purchase-invoices/valued-grns");
        return response.data ?? [];
    } catch (error) {
        console.error("Get valued GRNs error:", error);
        return [];
    }
}

export async function getAvailableLandedCosts() {
    try {
        const response = await authFetch("/purchase/purchase-invoices/available-landed-costs");
        return response.data ?? [];
    } catch (error) {
        console.error("Get available landed costs error:", error);
        return [];
    }
}
