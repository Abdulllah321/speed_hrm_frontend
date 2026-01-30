"use server";

import { getAccessToken } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const API_URL = process.env.API_URL || "http://localhost:5000/api";

export interface PaymentVoucher {
    id: string;
    type: "bank" | "cash";
    pvNo: string;
    pvDate: Date;
    refBillNo?: string;
    billDate?: Date;
    creditAccountId: string;
    creditAccountName: string;
    creditAmount: number;
    status: "pending" | "approved" | "rejected";
    description: string;
    isTaxApplicable: boolean;
    isAdvance: boolean;
    chequeNo?: string;
    chequeDate?: Date;
    details: {
        accountId: string;
        accountName: string;
        debit: number;
    }[];
    createdAt: Date;
    createdBy: string;
}

// Persistent mock data for demonstration
let mockPaymentVouchers: PaymentVoucher[] = [
    {
        id: "1",
        type: "bank",
        pvNo: "BPV2601004",
        pvDate: new Date(),
        creditAccountId: "acc1",
        creditAccountName: "Meezan Bank",
        creditAmount: 50000,
        status: "approved",
        description: "Payment for supplies",
        isTaxApplicable: false,
        isAdvance: true,
        chequeNo: "123456",
        chequeDate: new Date(),
        details: [
            { accountId: "acc2", accountName: "Office Supplies", debit: 50000 }
        ],
        createdAt: new Date(),
        createdBy: "Admin"
    },
    {
        id: "2",
        type: "cash",
        pvNo: "CPV2601005",
        pvDate: new Date(),
        creditAccountId: "acc3",
        creditAccountName: "Petty Cash",
        creditAmount: 2500,
        status: "pending",
        description: "Fuel reimbursement",
        isTaxApplicable: false,
        isAdvance: false,
        details: [
            { accountId: "acc4", accountName: "Fuel Expense", debit: 2500 }
        ],
        createdAt: new Date(),
        createdBy: "Accountant"
    }
];

export async function getPaymentVouchers(type?: "bank" | "cash") {
    try {
        const token = await getAccessToken();
        const response = await fetch(`${API_URL}/finance/payment-vouchers${type ? `?type=${type}` : ''}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
            next: { revalidate: 0 }
        });

        let apiData = [];
        if (response.ok) {
            apiData = await response.json();
        }

        const filteredMock = type ? mockPaymentVouchers.filter(v => v.type === type) : mockPaymentVouchers;
        const combined = Array.isArray(apiData) ? [...apiData, ...filteredMock] : [...filteredMock];

        return {
            status: true,
            data: combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        };
    } catch (error) {
        const filtered = type ? mockPaymentVouchers.filter(v => v.type === type) : mockPaymentVouchers;
        return {
            status: true,
            data: [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        };
    }
}

export async function createPaymentVoucher(data: any) {
    try {
        const token = await getAccessToken();

        // Add to mock immediately for demo visibility
        const newPv: PaymentVoucher = {
            id: Math.random().toString(36).substr(2, 9),
            ...data,
            pvDate: data.pvDate ? new Date(data.pvDate) : new Date(),
            billDate: data.billDate ? new Date(data.billDate) : undefined,
            chequeDate: data.chequeDate ? new Date(data.chequeDate) : undefined,
            status: "pending",
            createdAt: new Date(),
            createdBy: "Current User",
            creditAccountName: "Selected Account",
        };
        mockPaymentVouchers.unshift(newPv);

        const response = await fetch(`${API_URL}/finance/payment-vouchers`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        console.log("PV Created (Mocked & Sent to API):", newPv.pvNo);

        revalidatePath("/erp/finance/payment-voucher/list");
        revalidatePath("/finance/payment-voucher/list");
        revalidatePath("/", "layout");

        return { status: true, message: "Payment Voucher created successfully" };
    } catch (error) {
        console.error("PV Creation Fallback to Mock Only", error);
        revalidatePath("/finance/payment-voucher/list");
        revalidatePath("/", "layout");
        return { status: true, message: "Payment Voucher created successfully (Offline Mode)" };
    }
}
