"use server";

import { authFetch } from "@/lib/auth";

export interface VoucherRegisterItem {
  id: string;
  voucherNumber: string;
  voucherType: string;
  dateTime: string;
  createdAtRaw?: string;
  companyName: string;
  companyGlCode: string;
  customerDetail: string;
  customerName?: string;
  customerPhone?: string;
  outletName: string;
  baseCashMemo: string;
  validTill: string;
  expiresAtRaw?: string | null;
  isExpired?: boolean;
  daysToExpiry?: number | null;
  discountAmount: number;
  faceValue: number;
  netValue: number;
  settledInCashMemo: string;
  settledDateTime: string;
  settledAmount: number;
  outstandingAmount: number;
  status: string; // 'ACTIVE', 'REDEEMED', 'EXPIRED'
  paymentMode?: string;
  merchantName?: string;
  slipNo?: string;
  cardholderName?: string;
  cardLast4?: string;
  description?: string;
  redemptionList?: Array<{
    orderNumber: string;
    amountUsed: number;
    dateTime: string;
  }>;
}

export interface VoucherRegisterReportData {
  items: VoucherRegisterItem[];
  kpis: {
    totalVouchers: number;
    totalAmount: number;
    totalDiscount: number;
    totalNetValue: number;
    totalSettledAmount: number;
    totalOutstandingAmount: number;
    totalOutstandingCount: number;
    totalRedeemedCount: number;
    totalActiveCount: number;
    totalExpiredCount: number;
    typeBreakdown: Record<string, number>;
    typeBreakdownDetails?: Record<
      string,
      {
        count: number;
        faceValue: number;
        discount: number;
        settledAmount: number;
        outstandingAmount: number;
      }
    >;
    statusBreakdown?: Record<string, number>;
  };
  startDate: string;
  endDate: string;
  asOfDate?: string;
  isOutstandingOnly?: boolean;
}

export interface GetVoucherRegisterReportParams {
  voucherType?: string;
  status?: string;
  locationId?: string;
  startDate?: string;
  endDate?: string;
  asOfDate?: string;
  isOutstandingOnly?: boolean;
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
        asOfDate: params.asOfDate || undefined,
        isOutstandingOnly: params.isOutstandingOnly ? "true" : undefined,
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
  asOfDate?: string;
  isOutstandingOnly?: boolean;
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

