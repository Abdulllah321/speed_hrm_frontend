"use server";

import { getAccessToken } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const API_URL = process.env.API_URL || "http://localhost:5000/api";

export interface ReceiptVoucher {
    id: string;
    type: "bank" | "cash";
    rvNo: string;
    rvDate: string; // ISO string
    refBillNo?: string;
    billDate?: string; // ISO string
    debitAccountId: string;
    debitAccount?: any; // populated from backend
    debitAccountName?: string; // helper for UI
    debitAmount: number;
    status: "pending" | "approved" | "rejected";
    description: string;
    chequeNo?: string;
    chequeDate?: string; // ISO string
    details: {
        accountId: string;
        accountName?: string;
        credit: number;
    }[];
    createdAt: string;
    createdBy: string;
}

export async function getReceiptVouchers(type?: "bank" | "cash") {
    try {
        const token = await getAccessToken();
        const url = new URL(`${API_URL}/finance/receipt-vouchers`);
        if (type) {
            url.searchParams.append("type", type);
        }

        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            console.error("Failed to fetch receipt vouchers", response.status);
            return {
                status: false,
                data: []
            };
        }

        const data = await response.json();

        // Map backend data to frontend interface if needed
        const mappedData = data.map((rv: any) => ({
            ...rv,
            debitAccountName: rv.debitAccount?.name || "Unknown Account",
            details: rv.details.map((d: any) => ({
                ...d,
                accountName: d.account?.name || "Unknown Account"
            }))
        }));

        return {
            status: true,
            data: mappedData
        };
    } catch (error) {
        console.error("Error fetching receipt vouchers:", error);
        return {
            status: false,
            data: []
        };
    }
}

export async function createReceiptVoucher(data: any) {
    try {
        const token = await getAccessToken();

        // Ensure dates are stringified
        const payload = {
            ...data,
            rvDate: new Date(data.rvDate).toISOString(),
            billDate: data.billDate ? new Date(data.billDate).toISOString() : undefined,
            chequeDate: data.chequeDate ? new Date(data.chequeDate).toISOString() : undefined,
        };

        const response = await fetch(`${API_URL}/finance/receipt-vouchers`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                status: false,
                message: errorData.message || `Failed to create Receipt Voucher: ${response.statusText}`
            };
        }

        revalidatePath("/finance/receipt-voucher/list");
        revalidatePath("/erp/finance/receipt-voucher/list");

        return { status: true, message: "Receipt Voucher created successfully" };
    } catch (error: any) {
        console.error("Error creating receipt voucher:", error);
        return { status: false, message: error.message || "An unexpected error occurred" };
    }
}
