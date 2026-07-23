"use server";

import { authFetch } from "@/lib/auth";

export interface GiftVoucherSaleRegisterItem {
  id: string;
  voucherNumber: string;
  voucherType: string;
  dateTime: string;
  outletName: string;
  customerDetail: string;
  validTill: string;
  discountAmount: number;
  amount: number;
  baseInvoiceNumber: string;
  settledInInvoice: string;
  settledDateTime: string;
  status: string;
}

export interface GiftVoucherSaleRegisterReportData {
  items: GiftVoucherSaleRegisterItem[];
  kpis: {
    totalVouchers: number;
    totalAmount: number;
    totalDiscount: number;
    totalSettledAmount: number;
  };
  startDate: string;
  endDate: string;
}

export interface GetGiftVoucherSaleRegisterReportParams {
  locationId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export async function getGiftVoucherSaleRegisterReport(
  params: GetGiftVoucherSaleRegisterReportParams,
): Promise<{ status: boolean; data?: GiftVoucherSaleRegisterReportData; message?: string }> {
  try {
    const res = await authFetch("/pos-sales/reports/gift-voucher-sale-register", {
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
    console.error("getGiftVoucherSaleRegisterReport error:", error);
    return { status: false, message: error?.message || "Network error loading report" };
  }
}

export async function queueGiftVoucherSaleRegisterExport(params: {
  locationId?: string;
  startDate?: string;
  endDate?: string;
  format: "xlsx" | "pdf";
  search?: string;
}): Promise<{ status: boolean; data?: { jobId: string }; message?: string }> {
  try {
    const res = await authFetch("/pos-sales/reports/gift-voucher-sale-register/export", {
      method: "POST",
      body: JSON.stringify(params),
    });

    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to queue export job" };
  } catch (error: any) {
    console.error("queueGiftVoucherSaleRegisterExport error:", error);
    return { status: false, message: error?.message || "Network error queueing export" };
  }
}

export async function getGiftVoucherSaleRegisterExportStatus(
  jobId: string,
): Promise<{ status: boolean; data?: { state: string; progress: number }; message?: string }> {
  try {
    const res = await authFetch(`/pos-sales/reports/gift-voucher-sale-register/export-status/${jobId}`);
    if (res.ok && res.data?.status) {
      return { status: true, data: res.data.data };
    }
    return { status: false, message: res.data?.message || "Failed to fetch export status" };
  } catch (error: any) {
    console.error("getGiftVoucherSaleRegisterExportStatus error:", error);
    return { status: false, message: error?.message || "Error checking job status" };
  }
}
