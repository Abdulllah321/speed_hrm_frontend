"use server";

import { authFetch } from "@/lib/auth";

export interface CorporateVoucherItem {
  id: string;
  voucherNumber: string;
  dateTime: string;
  companyName: string;
  companyGlCode: string;
  customerDetail: string;
  validTill: string;
  outletName: string;
  discountAmount: number;
  faceValue: number;
  settledInInvoice: string;
  settledDateTime: string;
  status: string;
}

export interface CorporateVoucherReportData {
  items: CorporateVoucherItem[];
  kpis: {
    totalVouchers: number;
    totalAmount: number;
    totalDiscount: number;
    totalSettledAmount: number;
  };
  startDate: string;
  endDate: string;
}

export interface GetCorporateVoucherReportParams {
  locationId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export async function getCorporateVoucherReport(
  params: GetCorporateVoucherReportParams,
): Promise<{ status: boolean; data?: CorporateVoucherReportData; message?: string }> {
  try {
    const res = await authFetch("/pos-sales/reports/corporate-voucher", {
      params: {
        locationId: params.locationId || undefined,
        startDate: params.startDate || undefined,
        endDate: params.endDate || undefined,
        search: params.search || undefined,
      },
    });

    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to load report" };
  } catch (error: any) {
    console.error("getCorporateVoucherReport error:", error);
    return { status: false, message: error?.message || "Network error loading report" };
  }
}

export async function queueCorporateVoucherExport(params: {
  locationId?: string;
  startDate?: string;
  endDate?: string;
  format: "xlsx" | "pdf";
  search?: string;
}): Promise<{ status: boolean; data?: { jobId: string }; message?: string }> {
  try {
    const res = await authFetch("/pos-sales/reports/corporate-voucher/export", {
      method: "POST",
      body: JSON.stringify(params),
    });

    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to queue export job" };
  } catch (error: any) {
    console.error("queueCorporateVoucherExport error:", error);
    return { status: false, message: error?.message || "Network error queueing export" };
  }
}

export async function getCorporateVoucherExportStatus(
  jobId: string,
): Promise<{ status: boolean; data?: { state: string; progress: number }; message?: string }> {
  try {
    const res = await authFetch(`/pos-sales/reports/corporate-voucher/export-status/${jobId}`);
    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to fetch export status" };
  } catch (error: any) {
    console.error("getCorporateVoucherExportStatus error:", error);
    return { status: false, message: error?.message || "Error checking job status" };
  }
}

export interface CorporateClientSummaryItem {
  companyName: string;
  abbr: string;
  totalVouchers: number;
  totalFaceValue: number;
  redeemedCount: number;
  redeemedValue: number;
  outstandingCount: number;
  outstandingValue: number;
  denominations: Array<{ value: number; count: number }>;
  firstIssuedDate: string | null;
  lastIssuedDate: string | null;
}

export interface GroupedCorporateVoucherReportResult {
  clients: CorporateClientSummaryItem[];
  kpis: {
    totalClients: number;
    totalVouchers: number;
    totalFaceValue: number;
    totalRedeemedCount: number;
    totalRedeemedValue: number;
    totalOutstandingCount: number;
    totalOutstandingValue: number;
  };
  distinctAbbreviations: string[];
  startDate?: string;
  endDate?: string;
}

export async function getGroupedCorporateVoucherReport(params: {
  locationId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  abbr?: string;
  status?: string;
}): Promise<{ status: boolean; data?: GroupedCorporateVoucherReportResult; message?: string }> {
  try {
    const res = await authFetch("/pos-sales/reports/corporate-voucher/grouped", {
      params: {
        locationId: params.locationId || undefined,
        startDate: params.startDate || undefined,
        endDate: params.endDate || undefined,
        search: params.search || undefined,
        abbr: params.abbr || undefined,
        status: params.status || undefined,
      },
    });

    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to load grouped report" };
  } catch (error: any) {
    console.error("getGroupedCorporateVoucherReport error:", error);
    return { status: false, message: error?.message || "Network error loading grouped report" };
  }
}

export interface ClientVoucherDetailItem {
  id: string;
  code: string;
  voucherNumber?: string;
  companyName?: string;
  companyGlCode?: string;
  faceValue: number;
  discount: number;
  discountAmount?: number;
  status: string;
  issuedAt: string;
  dateTime?: string;
  expiresAt: string;
  validTill?: string;
  customerDetail?: string;
  outletName?: string;
  settledInInvoice: string;
  settledOutlet: string;
  settledDateTime: string;
}

export async function getCorporateClientVouchers(params: {
  companyName: string;
  abbr?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  locationId?: string;
  page?: number;
  limit?: number;
}): Promise<{
  status: boolean;
  data?: {
    items: ClientVoucherDetailItem[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  };
  message?: string;
}> {
  try {
    const res = await authFetch("/pos-sales/reports/corporate-voucher/client-vouchers", {
      params: {
        companyName: params.companyName,
        abbr: params.abbr || undefined,
        status: params.status || undefined,
        search: params.search || undefined,
        startDate: params.startDate || undefined,
        endDate: params.endDate || undefined,
        locationId: params.locationId || undefined,
        page: params.page ? String(params.page) : "1",
        limit: params.limit ? String(params.limit) : "50",
      },
    });

    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to load client vouchers" };
  } catch (error: any) {
    console.error("getCorporateClientVouchers error:", error);
    return { status: false, message: error?.message || "Network error loading client vouchers" };
  }
}
