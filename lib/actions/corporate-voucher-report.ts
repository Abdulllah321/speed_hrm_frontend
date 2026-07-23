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
