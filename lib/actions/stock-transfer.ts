"use server";

import { authFetch } from "@/lib/auth";

export async function getStockTransfers(filters?: {
    warehouseId?: string;
    status?: string;
    transferType?: string;
    dispatchType?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
}) {
    try {
        const queryParams = new URLSearchParams();
        if (filters?.warehouseId) queryParams.append("warehouseId", filters.warehouseId);
        if (filters?.status) queryParams.append("status", filters.status);
        if (filters?.transferType) queryParams.append("transferType", filters.transferType);
        if (filters?.dispatchType) queryParams.append("dispatchType", filters.dispatchType);
        if (filters?.search) queryParams.append("search", filters.search);
        if (filters?.dateFrom) queryParams.append("dateFrom", filters.dateFrom);
        if (filters?.dateTo) queryParams.append("dateTo", filters.dateTo);
        if (filters?.page) queryParams.append("page", String(filters.page));
        if (filters?.limit) queryParams.append("limit", String(filters.limit));
        if (filters?.sortBy) queryParams.append("sortBy", filters.sortBy);
        if (filters?.sortOrder) queryParams.append("sortOrder", filters.sortOrder);

        const queryString = queryParams.toString();
        const url = `/transfer-request${queryString ? `?${queryString}` : ""}`;

        const response = await authFetch(url, {
            method: "GET",
        });

        const result = response.data;

        if (result.status) {
            return { status: true, data: result.data, meta: result.meta };
        }

        return { status: false, data: [], meta: null, message: result.message || "Failed to fetch stock transfers" };
    } catch (error) {
        console.error("Get stock transfers error:", error);
        return { status: false, data: [], meta: null, message: "Failed to connect to server" };
    }
}

export async function queueDeliveryNotesExport(filters?: {
    reportType?: 'summary' | 'detailed';
    warehouseId?: string;
    status?: string;
    transferType?: string;
    dispatchType?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
}): Promise<{ status: boolean; data?: { jobId: string }; message?: string }> {
    try {
        const queryParams = new URLSearchParams();
        if (filters?.reportType) queryParams.append("reportType", filters.reportType);
        if (filters?.warehouseId) queryParams.append("warehouseId", filters.warehouseId);
        if (filters?.status) queryParams.append("status", filters.status);
        if (filters?.transferType) queryParams.append("transferType", filters.transferType);
        if (filters?.dispatchType) queryParams.append("dispatchType", filters.dispatchType);
        if (filters?.search) queryParams.append("search", filters.search);
        if (filters?.dateFrom) queryParams.append("dateFrom", filters.dateFrom);
        if (filters?.dateTo) queryParams.append("dateTo", filters.dateTo);

        const queryString = queryParams.toString();
        const url = `/transfer-request/export${queryString ? `?${queryString}` : ""}`;

        const response = await authFetch(url, {
            method: "POST",
        });

        return response.data ?? { status: false, message: "No response from server" };
    } catch (error) {
        console.error("Queue delivery notes export error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}

export async function checkDeliveryNotesExportStatus(jobId: string): Promise<{ status: boolean; data?: { state: string; progress: number }; message?: string }> {
    try {
        const response = await authFetch(`/transfer-request/export/${jobId}/status`, {
            method: "GET",
        });
        return response.data ?? { status: false, message: "Failed to fetch job status" };
    } catch (error) {
        console.error("Check delivery notes export status error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}


