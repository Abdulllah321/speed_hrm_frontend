"use server";

import { revalidatePath } from "next/cache";
import { authFetch } from "@/lib/auth";

export interface JournalVoucherDetail {
    id?: string;
    accountId: string;
    accountName?: string;
    accountCode?: string;
    tagAccountId?: string;
    tagAccountName?: string;
    tagAccountCode?: string;
    debit: number;
    credit: number;
    narration?: string;
    refBillNo?: string;
    refBillNo2?: string;
    taxType?: string;
}

export interface JournalVoucher {
    id: string;
    jvNo: string;
    folio?: string | null;
    jvDate: string;
    description?: string;
    refBillNo?: string;
    refBillNo2?: string;
    taxType?: string;
    details: JournalVoucherDetail[];
    status: "draft" | "pending_check" | "pending_approval" | "approved" | "rejected";
    makerId?: string;
    checkerId?: string;
    authorizerId?: string;
    checkedAt?: string;
    approvedAt?: string;
    rejectionReason?: string;
    remarks?: string;
    lastPrintedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface JournalVoucherFilters {
    status?: string;
    fromDate?: string;
    toDate?: string;
    accountId?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
}

export async function getJournalVouchers(filters?: JournalVoucherFilters) {
    try {
        const queryParams = new URLSearchParams();
        if (filters?.status && filters.status !== "all") queryParams.append("status", filters.status);
        if (filters?.fromDate) queryParams.append("fromDate", filters.fromDate);
        if (filters?.toDate) queryParams.append("toDate", filters.toDate);
        if (filters?.accountId && filters.accountId !== "all") queryParams.append("accountId", filters.accountId);
        if (filters?.search?.trim()) queryParams.append("search", filters.search.trim());
        if (filters?.page) queryParams.append("page", String(filters.page));
        if (filters?.limit) queryParams.append("limit", String(filters.limit));
        if (filters?.sortBy) queryParams.append("sortBy", filters.sortBy);
        if (filters?.sortOrder) queryParams.append("sortOrder", filters.sortOrder);

        const response = await authFetch(`/finance/journal-voucher?${queryParams.toString()}`, {
            cache: 'no-store',
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            console.error("Failed to fetch journal vouchers", response.status);
            return {
                status: false,
                data: [],
                pagination: { total: 0, page: 1, limit: 10, totalPages: 1 }
            };
        }

        const data = response.data;
        const vouchersArray = Array.isArray(data) ? data : (data?.data ?? []);
        const pagination = data.pagination || {
            total: vouchersArray.length,
            page: filters?.page || 1,
            limit: filters?.limit || 10,
            totalPages: Math.ceil(vouchersArray.length / (filters?.limit || 10)) || 1,
        };

        const mappedData = vouchersArray.map((jv: any) => ({
            ...jv,
            details: jv.details?.map((d: any) => ({
                ...d,
                accountName:     d.account?.name     || d.accountName     || "Unknown Account",
                accountCode:     d.account?.code     || d.accountCode     || "",
                tagAccountName:  d.tagAccount?.name  || d.tagAccountName  || "",
                tagAccountCode:  d.tagAccount?.code  || d.tagAccountCode  || "",
                debit:           Number(d.debit)  || 0,
                credit:          Number(d.credit) || 0,
            })) || []
        }));

        return {
            status: true,
            data: mappedData,
            pagination,
        };
    } catch (error) {
        console.error("Error fetching journal vouchers:", error);
        return { 
            status: false, 
            data: [], 
            pagination: { total: 0, page: 1, limit: 10, totalPages: 1 } 
        };
    }
}

export async function getJournalVoucher(id: string): Promise<{ status: boolean; data: JournalVoucher | null; message?: string }> {
    try {
        const response = await authFetch(`/finance/journal-voucher/${id}`, {
            cache: 'no-store',
            next: { revalidate: 0 },
        });

        if (!response.ok) {
            return { status: false, data: null, message: `Failed to fetch journal voucher: ${response.status}` };
        }

        const ACCOUNT_SEQUENCE_MAP: Record<string, number> = {
            "70010001": 1,
            "80010001": 2,
            "12030002": 3,
            "70010009": 4,
            "80010009": 5,
            "70010005": 6,
            "80010005": 7,
            "12030003": 8,
            "12060001": 9,
            "12030004": 10,
            "31030001": 11,
            "12030005": 12,
            "31030002": 13,
        };

        const getSeqOrder = (code?: string) => (code && ACCOUNT_SEQUENCE_MAP[code]) ? ACCOUNT_SEQUENCE_MAP[code] : 99;

        const raw = response.data?.data ?? response.data;
        const details = (raw.details ?? []).map((d: any) => ({
            ...d,
            accountName:     d.account?.name     || d.accountName     || "Unknown Account",
            accountCode:     d.account?.code     || d.accountCode     || "",
            tagAccountName:  d.tagAccount?.name  || d.tagAccountName  || "",
            tagAccountCode:  d.tagAccount?.code  || d.tagAccountCode  || "",
            debit:           Number(d.debit)  || 0,
            credit:          Number(d.credit) || 0,
        })).sort((a: any, b: any) => getSeqOrder(a.accountCode) - getSeqOrder(b.accountCode));

        const voucher: JournalVoucher = {
            ...raw,
            details,
        };

        return { status: true, data: voucher };
    } catch (error: any) {
        console.error("Error fetching journal voucher:", error);
        return { status: false, data: null, message: error.message };
    }
}

export async function createJournalVoucher(data: any) {
    try {
        const response = await authFetch("/finance/journal-voucher", {
            method: "POST",
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = response.data || {};
            return {
                status: false,
                message: errorData.message || `Failed to create Journal Voucher: ${response.statusText || response.status}`
            };
        }

        const result = response.data;

        revalidatePath("/finance/journal-voucher/list");
        revalidatePath("/erp/finance/journal-voucher/list");

        return { status: true, message: "Journal Voucher created successfully", data: result };
    } catch (error: any) {
        console.error("Error creating journal voucher:", error);
        return { status: false, message: error.message || "An unexpected error occurred" };
    }
}

export async function updateJournalVoucher(id: string, data: any) {
    try {
        const response = await authFetch(`/finance/journal-voucher/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = response.data || {};
            return {
                status: false,
                message: errorData.message || `Failed to update Journal Voucher: ${response.statusText || response.status}`
            };
        }

        const result = response.data;

        revalidatePath("/finance/journal-voucher/list");
        revalidatePath(`/erp/finance/journal-voucher/${id}`);
        revalidatePath("/erp/finance/journal-voucher/list");

        return { status: true, message: "Journal Voucher updated successfully", data: result };
    } catch (error: any) {
        console.error("Error updating journal voucher:", error);
        return { status: false, message: error.message || "An unexpected error occurred" };
    }
}

export async function deleteJournalVoucher(id: string) {
    try {
        const response = await authFetch(`/finance/journal-voucher/${id}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            const errorData = response.data || {};
            return {
                status: false,
                message: errorData.message || `Failed to delete Journal Voucher: ${response.statusText || response.status}`
            };
        }

        revalidatePath("/finance/journal-voucher/list");
        revalidatePath("/erp/finance/journal-voucher/list");

        return { status: true, message: "Journal Voucher deleted successfully" };
    } catch (error: any) {
        console.error("Error deleting journal voucher:", error);
        return { status: false, message: error.message || "An unexpected error occurred" };
    }
}

export async function updateJournalVoucherStatus(id: string, status: "draft" | "pending_check" | "pending_approval" | "approved" | "rejected", remarks?: string) {
    try {
        const response = await authFetch(`/finance/journal-voucher/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status, remarks }),
        });

        if (!response.ok) {
            const err = response.data || {};
            return { status: false, message: err.message || `Failed to update status: ${response.status}` };
        }

        revalidatePath("/erp/finance/journal-voucher/list");
        revalidatePath(`/erp/finance/journal-voucher/${id}`);
        return { status: true, message: `Journal Voucher ${status} successfully` };
    } catch (e: any) {
        return { status: false, message: e.message || "An unexpected error occurred" };
    }
}

export async function unapproveJournalVoucher(id: string, remarks?: string) {
    try {
        const response = await authFetch(`/finance/journal-voucher/${id}/unapprove`, {
            method: "PATCH",
            body: JSON.stringify({ remarks }),
        });

        if (!response.ok) {
            const err = response.data || {};
            return { status: false, message: err.message || `Failed to unapprove voucher: ${response.status}` };
        }

        revalidatePath("/erp/finance/journal-voucher/list");
        revalidatePath(`/erp/finance/journal-voucher/${id}`);
        return { status: true, message: "Journal Voucher unapproved successfully" };
    } catch (e: any) {
        return { status: false, message: e.message || "An unexpected error occurred" };
    }
}

// ── Background export ─────────────────────────────────────────────────────────
export async function queueJournalVouchersExport(opts?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    accountId?: string;
    search?: string;
    ids?: string[];
}): Promise<{ status: boolean; jobId?: string; message?: string }> {
    try {
        const params = new URLSearchParams();
        if (opts?.status    && opts.status    !== 'all') params.set('status',    opts.status);
        if (opts?.dateFrom)                              params.set('dateFrom',  opts.dateFrom);
        if (opts?.dateTo)                                params.set('dateTo',    opts.dateTo);
        if (opts?.accountId && opts.accountId !== 'all') params.set('accountId', opts.accountId);
        if (opts?.search    && opts.search.trim())       params.set('search',    opts.search.trim());
        if (opts?.ids       && opts.ids.length > 0)      params.set('ids',       opts.ids.join(','));

        const response = await authFetch(
            `/finance/journal-vouchers/export?${params.toString()}`,
            { method: 'POST' },
        );

        if (!response.ok) {
            const err = response.data || {};
            return { status: false, message: err.message || 'Failed to queue export' };
        }

        const result = response.data;
        return { status: true, jobId: result?.data?.jobId };
    } catch (error: any) {
        return { status: false, message: error.message || 'An unexpected error occurred' };
    }
}

export async function markJournalVoucherAsPrinted(id: string) {
    try {
        const response = await authFetch(`/finance/journal-voucher/${id}/print`, {
            method: "PATCH",
        });
        if (!response.ok) {
            return { status: false, message: "Failed to mark journal voucher as printed" };
        }
        revalidatePath("/erp/finance/journal-voucher");
        return { status: true, data: response.data };
    } catch {
        return { status: false, message: "Network error occurred" };
    }
}

