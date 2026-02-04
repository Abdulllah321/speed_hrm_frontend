"use server";

import { authFetch } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface PaymentVoucher {
    id: string;
    type: "bank" | "cash";
    pvNo: string;
    pvDate: string; // ISO string from API
    refBillNo?: string;
    billDate?: string; // ISO string
    creditAccountId: string;
    creditAccount?: any; // populated from backend
    creditAccountName?: string; // helper for UI
    creditAmount: number;
    status: "pending" | "approved" | "rejected";
    description: string;
    isTaxApplicable: boolean;
    isAdvance: boolean;
    chequeNo?: string;
    chequeDate?: string; // ISO string
    details: {
        accountId: string;
        accountName?: string;
        debit: number;
    }[];
    createdAt: string;
    createdBy: string;
}

export async function getPaymentVouchers(type?: "bank" | "cash") {
    try {
        const queryParams = new URLSearchParams();
        if (type) {
            queryParams.append("type", type);
        }

        const response = await authFetch(`/finance/payment-vouchers?${queryParams.toString()}`, {
            cache: 'no-store',
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            console.error("Failed to fetch payment vouchers", response.status);
            return {
                status: false,
                data: []
            };
        }

        const data = await response.json();

        // Map backend data to frontend interface if needed
        // Backend returns `creditAccount` object, frontend list expects `creditAccountName`
        const mappedData = data.map((pv: any) => ({
            ...pv,
            creditAccountName: pv.creditAccount?.name || "Unknown Account",
            details: pv.details.map((d: any) => ({
                ...d,
                accountName: d.account?.name || "Unknown Account"
            }))
        }));

        return {
            status: true,
            data: mappedData
        };
    } catch (error) {
        console.error("Error fetching payment vouchers:", error);
        return {
            status: false,
            data: []
        };
    }
}

export async function createPaymentVoucher(data: any) {
    try {
        // Ensure dates are stringified if they aren't already
        const payload = {
            ...data,
            pvDate: new Date(data.pvDate).toISOString(),
            billDate: data.billDate ? new Date(data.billDate).toISOString() : undefined,
            chequeDate: data.chequeDate ? new Date(data.chequeDate).toISOString() : undefined,
        };

        const response = await authFetch("/finance/payment-vouchers", {
            method: "POST",
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                status: false,
                message: errorData.message || `Failed to create Payment Voucher: ${response.statusText || response.status}`
            };
        }

        revalidatePath("/finance/payment-voucher/list");
        revalidatePath("/erp/finance/payment-voucher/list");

        return { status: true, message: "Payment Voucher created successfully" };
    } catch (error: any) {
        console.error("Error creating payment voucher:", error);
        return { status: false, message: error.message || "An unexpected error occurred" };
    }
}
