"use server";

import { authFetch } from "@/lib/auth";

export async function queueWholesaleReturnRegisterPreview(opts: {
    customerId?: string;
    startDate?: string;
    endDate?: string;
    reportType?: "merged" | "separate";
    search?: string;
    fiscalYear?: string;
    year?: number | string;
}): Promise<{ status: boolean; data?: { jobId: string }; message?: string }> {
    try {
        const res = await authFetch("/sales/reports/wholesale-return-register/queue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(opts),
        });
        return res.data || res;
    } catch (err: any) {
        return { status: false, message: err.message || "Network error queueing wholesale return calculation" };
    }
}

export async function getWholesaleReturnRegisterResult(
    jobId: string,
): Promise<{ status: boolean; data?: any; message?: string }> {
    try {
        const res = await authFetch(`/sales/reports/wholesale-return-register/result/${jobId}`, {
            method: "GET",
        });
        return res.data || res;
    } catch (err: any) {
        return { status: false, message: err.message || "Network error fetching wholesale return result" };
    }
}

export async function queueWholesaleReturnRegisterExport(filters: {
    customerId?: string;
    startDate?: string;
    endDate?: string;
    format: "xlsx" | "pdf";
    reportType?: "merged" | "separate";
    search?: string;
    fiscalYear?: string;
    year?: string | number;
}) {
    try {
        const res = await authFetch(`/sales/reports/wholesale-return-register/export/queue`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(filters),
        });
        return res.data ?? { status: false, message: "No response from server" };
    } catch (error) {
        console.error("queueWholesaleReturnRegisterExport error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}

export async function getWholesaleReturnRegisterExportStatus(jobId: string) {
    try {
        const res = await authFetch(`/sales/reports/wholesale-return-register/export/${jobId}/status`, { method: "GET" });
        return res.data ?? { status: false, message: "No response from server" };
    } catch (error) {
        console.error("getWholesaleReturnRegisterExportStatus error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}
