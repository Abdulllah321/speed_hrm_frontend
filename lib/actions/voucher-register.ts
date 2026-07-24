"use server";

import { authFetch } from "@/lib/auth";

export interface VoucherRegisterItem {
  id: string;
  voucherNumber: string;
  voucherType: string;
  dateTime: string;
  companyName: string;
  companyGlCode: string;
  customerDetail: string;
  outletName: string;
  baseCashMemo: string;
  validTill: string;
  discountAmount: number;
  faceValue: number;
  settledInCashMemo: string;
  settledDateTime: string;
  status: string;
}

export interface VoucherRegisterReportData {
  items: VoucherRegisterItem[];
  kpis: {
    totalVouchers: number;
    totalAmount: number;
    totalDiscount: number;
    totalSettledAmount: number;
    typeBreakdown: Record<string, number>;
  };
  startDate: string;
  endDate: string;
}

export interface GetVoucherRegisterReportParams {
  voucherType?: string;
  status?: string;
  locationId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export async function getVoucherRegisterReport(
  params: GetVoucherRegisterReportParams,
): Promise<{ status: boolean; data?: VoucherRegisterReportData; message?: string }> {
  try {
    const res = await authFetch("/pos-sales/reports/voucher-register", {
      params: {
        voucherType: params.voucherType || undefined,
        status: params.status || undefined,
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
    console.error("getVoucherRegisterReport error:", error);
    return { status: false, message: error?.message || "Network error loading report" };
  }
}

export async function queueVoucherRegisterExport(params: {
  voucherType?: string;
  status?: string;
  locationId?: string;
  startDate?: string;
  endDate?: string;
  format: "xlsx" | "pdf";
  search?: string;
}): Promise<{ status: boolean; data?: { jobId: string }; message?: string }> {
  try {
    const res = await authFetch("/pos-sales/reports/voucher-register/export", {
      method: "POST",
      body: JSON.stringify(params),
    });

    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to queue export job" };
  } catch (error: any) {
    console.error("queueVoucherRegisterExport error:", error);
    return { status: false, message: error?.message || "Network error queueing export" };
  }
}

export async function getVoucherRegisterExportStatus(
  jobId: string,
): Promise<{ status: boolean; data?: { state: string; progress: number }; message?: string }> {
  try {
    const res = await authFetch(`/pos-sales/reports/voucher-register/export-status/${jobId}`);
    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to fetch export status" };
  } catch (error: any) {
    console.error("getVoucherRegisterExportStatus error:", error);
    return { status: false, message: error?.message || "Error checking job status" };
  }
}
