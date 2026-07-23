"use server";

import { authFetch } from "@/lib/auth";

export interface CreditVoucherItem {
  id: string;
  voucherNumber: string;
  dateTime: string;
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

export interface CreditVoucherReportData {
  items: CreditVoucherItem[];
  kpis: {
    totalVouchers: number;
    totalAmount: number;
    totalDiscount: number;
    totalSettledAmount: number;
  };
  startDate: string;
  endDate: string;
}

export interface GetCreditVoucherReportParams {
  locationId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export async function getCreditVoucherReport(
  params: GetCreditVoucherReportParams,
): Promise<{ status: boolean; data?: CreditVoucherReportData; message?: string }> {
  try {
    const res = await authFetch("/pos-sales/reports/credit-voucher", {
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
    console.error("getCreditVoucherReport error:", error);
    return { status: false, message: error?.message || "Network error loading report" };
  }
}

export async function queueCreditVoucherExport(params: {
  locationId?: string;
  startDate?: string;
  endDate?: string;
  format: "xlsx" | "pdf";
  search?: string;
}): Promise<{ status: boolean; data?: { jobId: string }; message?: string }> {
  try {
    const res = await authFetch("/pos-sales/reports/credit-voucher/export", {
      method: "POST",
      body: JSON.stringify(params),
    });

    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to queue export job" };
  } catch (error: any) {
    console.error("queueCreditVoucherExport error:", error);
    return { status: false, message: error?.message || "Network error queueing export" };
  }
}

export async function getCreditVoucherExportStatus(
  jobId: string,
): Promise<{ status: boolean; data?: { state: string; progress: number }; message?: string }> {
  try {
    const res = await authFetch(`/pos-sales/reports/credit-voucher/export-status/${jobId}`);
    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to fetch export status" };
  } catch (error: any) {
    console.error("getCreditVoucherExportStatus error:", error);
    return { status: false, message: error?.message || "Error checking job status" };
  }
}
