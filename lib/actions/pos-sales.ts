"use server";

import { authFetch } from "@/lib/auth";

export interface SalesOrder {
    id: string;
    orderNumber: string;
    status: string;
    grandTotal: number;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    paymentMethod: string | null;
    tenderType: string | null;
    cashAmount: number;
    cardAmount: number;
    isGiftReceipt: boolean;
    createdAt: string;
    updatedAt: string;
    tenders: { method: string; amount: number; cardLast4?: string; slipNo?: string }[];
    items: any[];
    promo: { name: string; code: string } | null;
    coupon: { code: string; description: string } | null;
    alliance: { partnerName: string; code: string; discountPercent: number; maxDiscount: number } | null;
    claims?: Array<{
        id: string;
        claimNumber: string;
        claimType: string;
        status: string;
        claimedAmount: number;
        approvedAmount: number;
        submittedAt: string;
        reviewedAt: string | null;
        items: Array<{
            itemId: string;
            claimedQty: number;
            approvedQty: number;
            itemStatus: string;
        }>;
    }>;
}

export interface ListOrdersResult {
    status: boolean;
    data: SalesOrder[];
    meta: { total: number; page: number; limit: number; totalPages: number };
    message?: string;
}

export async function listSalesOrders(params?: {
    page?: number;
    limit?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    locationId?: string;
}): Promise<ListOrdersResult> {
    try {
        const res = await authFetch("/pos-sales/orders", {
            params: {
                page: params?.page ?? 1,
                limit: params?.limit ?? 100,
                search: params?.search || undefined,
                startDate: params?.startDate || undefined,
                endDate: params?.endDate || undefined,
                locationId: params?.locationId || undefined,
            },
        });

        if (res.ok && res.data?.status) {
            return {
                status: true,
                data: res.data.data ?? [],
                meta: res.data.meta ?? { total: 0, page: 1, limit: 100, totalPages: 0 },
            };
        }

        return { status: false, data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 }, message: res.data?.message };
    } catch (error) {
        console.error("listSalesOrders error:", error);
        return { status: false, data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 }, message: "Failed to fetch orders" };
    }
}

export interface ListActivitiesResult {
    status: boolean;
    data: any[];
    meta: { total: number; page: number; limit: number; totalPages: number };
    message?: string;
}

export async function listSalesActivities(params?: {
    page?: number;
    limit?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    activityType?: string;
    posId?: string;
}): Promise<ListActivitiesResult> {
    try {
        const res = await authFetch("/pos-sales/activities", {
            params: {
                page: params?.page ?? 1,
                limit: params?.limit ?? 20,
                search: params?.search || undefined,
                startDate: params?.startDate || undefined,
                endDate: params?.endDate || undefined,
                activityType: params?.activityType || undefined,
                posId: params?.posId || undefined,
            },
        });

        if (res.ok && res.data?.status) {
            return {
                status: true,
                data: res.data.data ?? [],
                meta: res.data.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 },
            };
        }

        return { status: false, data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 }, message: res.data?.message };
    } catch (error) {
        console.error("listSalesActivities error:", error);
        return { status: false, data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 }, message: "Failed to fetch activities" };
    }
}

export async function getSalespersons(locationId?: string) {
    try {
        const res = await authFetch(`/pos-sales/cashiers${locationId ? `?locationId=${locationId}` : ""}`, { method: "GET" });
        return res.data;
    } catch (error) {
        console.error("getSalespersons error:", error);
        return { status: false, data: [], message: "Failed to fetch cashiers" };
    }
}

export async function getNetSalesSummaryReport(filters: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
    cashierUserId?: string;
    summaryOnly?: boolean;
    showSalesperson?: boolean;
    showYear?: boolean;
    showMonth?: boolean;
    showDay?: boolean;
    showDocument?: boolean;
    showBrand?: boolean;
    showDivision?: boolean;
    showSalesTax?: boolean;
    showCategory?: boolean;
    showGender?: boolean;
    showSilhouette?: boolean;
    showArticle?: boolean;
    showVariant?: boolean;
}) {
    try {
        const queryParams = new URLSearchParams();
        if (filters.locationId) queryParams.append("locationId", filters.locationId);
        if (filters.startDate) queryParams.append("startDate", filters.startDate);
        if (filters.endDate) queryParams.append("endDate", filters.endDate);
        if (filters.cashierUserId) queryParams.append("cashierUserId", filters.cashierUserId);
        if (filters.summaryOnly) queryParams.append("summaryOnly", "true");
        if (filters.showSalesperson !== undefined) queryParams.append("showSalesperson", String(filters.showSalesperson));
        if (filters.showYear !== undefined) queryParams.append("showYear", String(filters.showYear));
        if (filters.showMonth !== undefined) queryParams.append("showMonth", String(filters.showMonth));
        if (filters.showDay !== undefined) queryParams.append("showDay", String(filters.showDay));
        if (filters.showDocument !== undefined) queryParams.append("showDocument", String(filters.showDocument));
        if (filters.showBrand !== undefined) queryParams.append("showBrand", String(filters.showBrand));
        if (filters.showDivision !== undefined) queryParams.append("showDivision", String(filters.showDivision));
        if (filters.showSalesTax !== undefined) queryParams.append("showSalesTax", String(filters.showSalesTax));
        if (filters.showCategory !== undefined) queryParams.append("showCategory", String(filters.showCategory));
        if (filters.showGender !== undefined) queryParams.append("showGender", String(filters.showGender));
        if (filters.showSilhouette !== undefined) queryParams.append("showSilhouette", String(filters.showSilhouette));
        if (filters.showArticle !== undefined) queryParams.append("showArticle", String(filters.showArticle));
        if (filters.showVariant !== undefined) queryParams.append("showVariant", String(filters.showVariant));

        const res = await authFetch(`/pos-sales/reports/net-sales-summary?${queryParams.toString()}`, { method: "GET" });
        return res.data;
    } catch (error) {
        console.error("getNetSalesSummaryReport error:", error);
        return { status: false, data: [], message: "Failed to fetch Net Sales Summary" };
    }
}

export async function queueNetSalesSummaryReportExport(filters: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
    cashierUserId?: string;
    format: "xlsx" | "pdf";
    summaryOnly?: boolean;
    showSalesperson?: boolean;
    showYear?: boolean;
    showMonth?: boolean;
    showDay?: boolean;
    showDocument?: boolean;
    showBrand?: boolean;
    showDivision?: boolean;
    showSalesTax?: boolean;
    showCategory?: boolean;
    showGender?: boolean;
    showSilhouette?: boolean;
    showArticle?: boolean;
    showVariant?: boolean;
}) {
    try {
        const res = await authFetch(`/pos-sales/reports/net-sales-summary/export/queue`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(filters),
        });
        return res.data ?? { status: false, message: "No response from server" };
    } catch (error) {
        console.error("queueNetSalesSummaryReportExport error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}

export async function getNetSalesSummaryReportExportStatus(jobId: string) {
    try {
        const res = await authFetch(`/pos-sales/reports/net-sales-summary/export/${jobId}/status`, { method: "GET" });
        return res.data ?? { status: false, message: "No response from server" };
    } catch (error) {
        console.error("getNetSalesSummaryReportExportStatus error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}

export async function queuePosSalesActivityExport(filters?: {
    search?: string;
    startDate?: string;
    endDate?: string;
    activityType?: string;
    posId?: string;
}) {
    try {
        const queryParams = new URLSearchParams();
        if (filters?.search) queryParams.append("search", filters.search);
        if (filters?.startDate) queryParams.append("startDate", filters.startDate);
        if (filters?.endDate) queryParams.append("endDate", filters.endDate);
        if (filters?.activityType && filters.activityType !== "all") {
            queryParams.append("activityType", filters.activityType);
        }
        if (filters?.posId) queryParams.append("posId", filters.posId);

        const res = await authFetch(`/pos-sales/activities/export?${queryParams.toString()}`, {
            method: "POST",
        });
        return res.data ?? { status: false, message: "No response from server" };
    } catch (error) {
        console.error("queuePosSalesActivityExport error:", error);
        return { status: false, message: "Failed to queue export" };
    }
}

export async function getPosSalesActivityExportStatus(jobId: string) {
    try {
        const res = await authFetch(`/pos-sales/activities/export/${jobId}/status`, {
            method: "GET",
        });
        return res.data ?? { status: false, message: "No response from server" };
    } catch (error) {
        console.error("getPosSalesActivityExportStatus error:", error);
        return { status: false, message: "Failed to fetch export status" };
    }
}

export async function getSalesRegisterReport(filters: {
    locationId: string;
    startDate?: string;
    endDate?: string;
    cashierUserId?: string;
    search?: string;
}) {
    try {
        const queryParams = new URLSearchParams();
        queryParams.append("locationId", filters.locationId);
        if (filters.startDate) queryParams.append("startDate", filters.startDate);
        if (filters.endDate) queryParams.append("endDate", filters.endDate);
        if (filters.cashierUserId) queryParams.append("cashierUserId", filters.cashierUserId);
        if (filters.search) queryParams.append("search", filters.search);

        const res = await authFetch(`/pos-sales/reports/sales-register?${queryParams.toString()}`, { method: "GET" });
        return res.data;
    } catch (error) {
        console.error("getSalesRegisterReport error:", error);
        return { status: false, data: [], message: "Failed to fetch Sales Register Report" };
    }
}

export async function queueSalesRegisterReportExport(filters: {
    locationId: string;
    startDate?: string;
    endDate?: string;
    cashierUserId?: string;
    format: "xlsx" | "pdf";
    search?: string;
}) {
    try {
        const res = await authFetch(`/pos-sales/reports/sales-register/export/queue`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(filters),
        });
        return res.data ?? { status: false, message: "No response from server" };
    } catch (error) {
        console.error("queueSalesRegisterReportExport error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}

export async function getSalesRegisterReportExportStatus(jobId: string) {
    try {
        const res = await authFetch(`/pos-sales/reports/sales-register/export/${jobId}/status`, { method: "GET" });
        return res.data ?? { status: false, message: "No response from server" };
    } catch (error) {
        console.error("getSalesRegisterReportExportStatus error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}

export async function getSalesListReport(filters: {
    locationId: string;
    startDate?: string;
    endDate?: string;
    cashierUserId?: string;
    search?: string;
    paymentModeGroup?: string;
    minAmount?: number;
    maxAmount?: number;
    fbrOnly?: boolean;
}) {
    try {
        const queryParams = new URLSearchParams();
        queryParams.append("locationId", filters.locationId);
        if (filters.startDate) queryParams.append("startDate", filters.startDate);
        if (filters.endDate) queryParams.append("endDate", filters.endDate);
        if (filters.cashierUserId) queryParams.append("cashierUserId", filters.cashierUserId);
        if (filters.search) queryParams.append("search", filters.search);
        if (filters.paymentModeGroup) queryParams.append("paymentModeGroup", filters.paymentModeGroup);
        if (filters.minAmount !== undefined) queryParams.append("minAmount", String(filters.minAmount));
        if (filters.maxAmount !== undefined) queryParams.append("maxAmount", String(filters.maxAmount));
        if (filters.fbrOnly !== undefined) queryParams.append("fbrOnly", String(filters.fbrOnly));

        const res = await authFetch(`/pos-sales/reports/sales-list?${queryParams.toString()}`, { method: "GET" });
        return res.data;
    } catch (error) {
        console.error("getSalesListReport error:", error);
        return { status: false, data: [], message: "Failed to fetch Sales List Report" };
    }
}

export async function queueSalesListReportExport(filters: {
    locationId: string;
    startDate?: string;
    endDate?: string;
    cashierUserId?: string;
    format: "xlsx" | "pdf";
    search?: string;
    paymentModeGroup?: string;
    minAmount?: number;
    maxAmount?: number;
    fbrOnly?: boolean;
}) {
    try {
        const res = await authFetch(`/pos-sales/reports/sales-list/export/queue`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(filters),
        });
        return res.data ?? { status: false, message: "No response from server" };
    } catch (error) {
        console.error("queueSalesListReportExport error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}

export async function getSalesListReportExportStatus(jobId: string) {
    try {
        const res = await authFetch(`/pos-sales/reports/sales-list/export/${jobId}/status`, { method: "GET" });
        return res.data ?? { status: false, message: "No response from server" };
    } catch (error) {
        console.error("getSalesListReportExportStatus error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}

// ─── Gross Sales Summary & Return Report Actions ──────────────────
export async function getGrossSalesSummaryReport(filters: {
    locationId: string;
    startDate?: string;
    endDate?: string;
    cashierUserId?: string;
    search?: string;
    paymentModeGroup?: string;
    minAmount?: number;
    maxAmount?: number;
    fbrOnly?: boolean;
    showBrand?: boolean;
    showDivision?: boolean;
    showCategory?: boolean;
    showGender?: boolean;
    showSilhouette?: boolean;
    showArticle?: boolean;
    showVariant?: boolean;
    showInvoices?: boolean;
}) {
    try {
        const queryParams = new URLSearchParams();
        queryParams.append("locationId", filters.locationId);
        if (filters.startDate) queryParams.append("startDate", filters.startDate);
        if (filters.endDate) queryParams.append("endDate", filters.endDate);
        if (filters.cashierUserId) queryParams.append("cashierUserId", filters.cashierUserId);
        if (filters.search) queryParams.append("search", filters.search);
        if (filters.paymentModeGroup) queryParams.append("paymentModeGroup", filters.paymentModeGroup);
        if (filters.minAmount !== undefined) queryParams.append("minAmount", String(filters.minAmount));
        if (filters.maxAmount !== undefined) queryParams.append("maxAmount", String(filters.maxAmount));
        if (filters.fbrOnly !== undefined) queryParams.append("fbrOnly", String(filters.fbrOnly));
        if (filters.showBrand !== undefined) queryParams.append("showBrand", String(filters.showBrand));
        if (filters.showDivision !== undefined) queryParams.append("showDivision", String(filters.showDivision));
        if (filters.showCategory !== undefined) queryParams.append("showCategory", String(filters.showCategory));
        if (filters.showGender !== undefined) queryParams.append("showGender", String(filters.showGender));
        if (filters.showSilhouette !== undefined) queryParams.append("showSilhouette", String(filters.showSilhouette));
        if (filters.showArticle !== undefined) queryParams.append("showArticle", String(filters.showArticle));
        if (filters.showVariant !== undefined) queryParams.append("showVariant", String(filters.showVariant));
        if (filters.showInvoices !== undefined) queryParams.append("showInvoices", String(filters.showInvoices));

        const res = await authFetch(`/pos-sales/reports/gross-sales-summary?${queryParams.toString()}`, { method: "GET" });
        return res.data;
    } catch (error) {
        console.error("getGrossSalesSummaryReport error:", error);
        return { status: false, data: [], message: "Failed to fetch Gross Sales Summary Report" };
    }
}

export async function queueGrossSalesSummaryReportExport(filters: {
    locationId: string;
    startDate?: string;
    endDate?: string;
    cashierUserId?: string;
    format: "xlsx" | "pdf";
    search?: string;
    paymentModeGroup?: string;
    minAmount?: number;
    maxAmount?: number;
    fbrOnly?: boolean;
    showBrand?: boolean;
    showDivision?: boolean;
    showCategory?: boolean;
    showGender?: boolean;
    showSilhouette?: boolean;
    showArticle?: boolean;
    showVariant?: boolean;
    showInvoices?: boolean;
}) {
    try {
        const res = await authFetch(`/pos-sales/reports/gross-sales-summary/export/queue`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(filters),
        });
        return res.data ?? { status: false, message: "No response from server" };
    } catch (error) {
        console.error("queueGrossSalesSummaryReportExport error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}

export async function getGrossSalesReturnReport(filters: {
    locationId: string;
    startDate?: string;
    endDate?: string;
    cashierUserId?: string;
    search?: string;
    paymentModeGroup?: string;
    minAmount?: number;
    maxAmount?: number;
    fbrOnly?: boolean;
    showBrand?: boolean;
    showDivision?: boolean;
    showCategory?: boolean;
    showGender?: boolean;
    showSilhouette?: boolean;
    showArticle?: boolean;
    showVariant?: boolean;
    showInvoices?: boolean;
}) {
    try {
        const queryParams = new URLSearchParams();
        queryParams.append("locationId", filters.locationId);
        if (filters.startDate) queryParams.append("startDate", filters.startDate);
        if (filters.endDate) queryParams.append("endDate", filters.endDate);
        if (filters.cashierUserId) queryParams.append("cashierUserId", filters.cashierUserId);
        if (filters.search) queryParams.append("search", filters.search);
        if (filters.paymentModeGroup) queryParams.append("paymentModeGroup", filters.paymentModeGroup);
        if (filters.minAmount !== undefined) queryParams.append("minAmount", String(filters.minAmount));
        if (filters.maxAmount !== undefined) queryParams.append("maxAmount", String(filters.maxAmount));
        if (filters.fbrOnly !== undefined) queryParams.append("fbrOnly", String(filters.fbrOnly));
        if (filters.showBrand !== undefined) queryParams.append("showBrand", String(filters.showBrand));
        if (filters.showDivision !== undefined) queryParams.append("showDivision", String(filters.showDivision));
        if (filters.showCategory !== undefined) queryParams.append("showCategory", String(filters.showCategory));
        if (filters.showGender !== undefined) queryParams.append("showGender", String(filters.showGender));
        if (filters.showSilhouette !== undefined) queryParams.append("showSilhouette", String(filters.showSilhouette));
        if (filters.showArticle !== undefined) queryParams.append("showArticle", String(filters.showArticle));
        if (filters.showVariant !== undefined) queryParams.append("showVariant", String(filters.showVariant));
        if (filters.showInvoices !== undefined) queryParams.append("showInvoices", String(filters.showInvoices));

        const res = await authFetch(`/pos-sales/reports/gross-sales-return?${queryParams.toString()}`, { method: "GET" });
        return res.data;
    } catch (error) {
        console.error("getGrossSalesReturnReport error:", error);
        return { status: false, data: [], message: "Failed to fetch Gross Sales Return Report" };
    }
}

export async function queueGrossSalesReturnReportExport(filters: {
    locationId: string;
    startDate?: string;
    endDate?: string;
    cashierUserId?: string;
    format: "xlsx" | "pdf";
    search?: string;
    paymentModeGroup?: string;
    minAmount?: number;
    maxAmount?: number;
    fbrOnly?: boolean;
    showBrand?: boolean;
    showDivision?: boolean;
    showCategory?: boolean;
    showGender?: boolean;
    showSilhouette?: boolean;
    showArticle?: boolean;
    showVariant?: boolean;
    showInvoices?: boolean;
}) {
    try {
        const res = await authFetch(`/pos-sales/reports/gross-sales-return/export/queue`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(filters),
        });
        return res.data ?? { status: false, message: "No response from server" };
    } catch (error) {
        console.error("queueGrossSalesReturnReportExport error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}

export async function getGrossSalesExportStatus(jobId: string) {
    try {
        const res = await authFetch(`/pos-sales/reports/gross-sales-export/${jobId}/status`, { method: "GET" });
        return res.data ?? { status: false, message: "No response from server" };
    } catch (error) {
        console.error("getGrossSalesExportStatus error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}

// ─── Alliance Register Report Actions ──────────────────────────────────────

export async function getAllianceRegisterReport(filters: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
    cashierUserId?: string;
    search?: string;
}) {
    try {
        const queryParams = new URLSearchParams();
        if (filters.locationId) queryParams.append("locationId", filters.locationId);
        if (filters.startDate) queryParams.append("startDate", filters.startDate);
        if (filters.endDate) queryParams.append("endDate", filters.endDate);
        if (filters.cashierUserId) queryParams.append("cashierUserId", filters.cashierUserId);
        if (filters.search) queryParams.append("search", filters.search);

        const res = await authFetch(`/pos-sales/reports/alliance-register?${queryParams.toString()}`, { method: "GET" });
        return res.data;
    } catch (error) {
        console.error("getAllianceRegisterReport error:", error);
        return { status: false, data: [], message: "Failed to fetch Alliance Register Report" };
    }
}

export async function queueAllianceRegisterReportExport(filters: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
    cashierUserId?: string;
    format: "xlsx" | "pdf";
    search?: string;
}) {
    try {
        const res = await authFetch(`/pos-sales/reports/alliance-register/export/queue`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(filters),
        });
        return res.data ?? { status: false, message: "No response from server" };
    } catch (error) {
        console.error("queueAllianceRegisterReportExport error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}

export async function getAllianceRegisterReportExportStatus(jobId: string) {
    try {
        const res = await authFetch(`/pos-sales/reports/alliance-register/export/${jobId}/status`, { method: "GET" });
        return res.data ?? { status: false, message: "No response from server" };
    } catch (error) {
        console.error("getAllianceRegisterReportExportStatus error:", error);
        return { status: false, message: "Failed to connect to server" };
    }
}

// ─── PRO ERP Sales List Actions ──────────────────────────────────────────

export async function queueSalesListPreview(opts: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
    cashierUserId?: string;
    reportType?: "merged" | "separate";
    search?: string;
    paymentModeGroup?: string;
    minAmount?: number;
    maxAmount?: number;
    fbrOnly?: boolean;
}): Promise<{ status: boolean; data?: { jobId: string }; message?: string }> {
    try {
        const res = await authFetch("/pos-sales/reports/sales-list/queue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(opts),
        });
        return res.data || res;
    } catch (err: any) {
        return { status: false, message: err.message || "Network error queueing sales list calculation" };
    }
}

export async function getSalesListResult(
    jobId: string,
): Promise<{ status: boolean; data?: any; message?: string }> {
    try {
        const res = await authFetch(`/pos-sales/reports/sales-list/result/${jobId}`, {
            method: "GET",
        });
        return res.data || res;
    } catch (err: any) {
        return { status: false, message: err.message || "Network error fetching sales list result" };
    }
}

// ─── PRO ERP Sales Register Actions ──────────────────────────────────────

export async function queueSalesRegisterPreview(opts: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
    cashierUserId?: string;
    reportType?: "merged" | "separate";
    search?: string;
    paymentModeGroup?: string;
    minAmount?: number;
    maxAmount?: number;
    fbrOnly?: boolean;
}): Promise<{ status: boolean; data?: { jobId: string }; message?: string }> {
    try {
        const res = await authFetch("/pos-sales/reports/sales-register/queue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(opts),
        });
        return res.data || res;
    } catch (err: any) {
        return { status: false, message: err.message || "Network error queueing sales register calculation" };
    }
}

export async function getSalesRegisterResult(
    jobId: string,
): Promise<{ status: boolean; data?: any; message?: string }> {
    try {
        const res = await authFetch(`/pos-sales/reports/sales-register/result/${jobId}`, {
            method: "GET",
        });
        return res.data || res;
    } catch (err: any) {
        return { status: false, message: err.message || "Network error fetching sales register result" };
    }
}

// ─── PRO ERP Sales Return Register Actions ────────────────────────────────

export async function queueGrossSalesReturnPreview(opts: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
    cashierUserId?: string;
    reportType?: "merged" | "separate";
    search?: string;
    paymentModeGroup?: string;
    minAmount?: number;
    maxAmount?: number;
    fbrOnly?: boolean;
}): Promise<{ status: boolean; data?: { jobId: string }; message?: string }> {
    try {
        const res = await authFetch("/pos-sales/reports/gross-sales-return/queue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(opts),
        });
        return res.data || res;
    } catch (err: any) {
        return { status: false, message: err.message || "Network error queueing sales return register calculation" };
    }
}

export async function getGrossSalesReturnResult(
    jobId: string,
): Promise<{ status: boolean; data?: any; message?: string }> {
    try {
        const res = await authFetch(`/pos-sales/reports/gross-sales-return/result/${jobId}`, {
            method: "GET",
        });
        return res.data || res;
    } catch (err: any) {
        return { status: false, message: err.message || "Network error fetching sales return register result" };
    }
}

// ─── PRO ERP Gross Sales Summary Actions ──────────────────────────────────

export async function queueGrossSalesSummaryPreview(opts: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
    cashierUserId?: string;
    reportType?: "merged" | "separate";
    search?: string;
    paymentModeGroup?: string;
    minAmount?: number;
    maxAmount?: number;
    fbrOnly?: boolean;
}): Promise<{ status: boolean; data?: { jobId: string }; message?: string }> {
    try {
        const res = await authFetch("/pos-sales/reports/gross-sales-summary/queue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(opts),
        });
        return res.data || res;
    } catch (err: any) {
        return { status: false, message: err.message || "Network error queueing gross sales summary calculation" };
    }
}

export async function getGrossSalesSummaryResult(
    jobId: string,
): Promise<{ status: boolean; data?: any; message?: string }> {
    try {
        const res = await authFetch(`/pos-sales/reports/gross-sales-summary/result/${jobId}`, {
            method: "GET",
        });
        return res.data || res;
    } catch (err: any) {
        return { status: false, message: err.message || "Network error fetching gross sales summary result" };
    }
}

// ─── PRO ERP Net Sales Summary Actions ────────────────────────────────────

export async function queueNetSalesSummaryPreview(opts: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
    cashierUserId?: string;
    reportType?: "merged" | "separate";
    search?: string;
    paymentModeGroup?: string;
    minAmount?: number;
    maxAmount?: number;
    fbrOnly?: boolean;
}): Promise<{ status: boolean; data?: { jobId: string }; message?: string }> {
    try {
        const res = await authFetch("/pos-sales/reports/net-sales-summary/queue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(opts),
        });
        return res.data || res;
    } catch (err: any) {
        return { status: false, message: err.message || "Network error queueing net sales summary calculation" };
    }
}

export async function getNetSalesSummaryResult(
    jobId: string,
): Promise<{ status: boolean; data?: any; message?: string }> {
    try {
        const res = await authFetch(`/pos-sales/reports/net-sales-summary/result/${jobId}`, {
            method: "GET",
        });
        return res.data || res;
    } catch (err: any) {
        return { status: false, message: err.message || "Network error fetching net sales summary result" };
    }
}

export async function registerClientNetSalesSummaryExport(opts: {
    fileName: string;
    fileBase64: string;
    mimeType?: string;
}): Promise<{ status: boolean; data?: { historyId: string; downloadUrl: string }; message?: string }> {
    try {
        const res = await authFetch("/pos-sales/reports/net-sales-summary/export/register-client-export", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(opts),
        });
        return res.data || res;
    } catch (err: any) {
        return { status: false, message: err.message || "Network error registering net sales summary export file" };
    }
}




